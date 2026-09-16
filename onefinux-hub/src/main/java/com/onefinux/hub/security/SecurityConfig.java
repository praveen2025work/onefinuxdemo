package com.onefinux.hub.security;

import com.onefinux.hub.config.CorsProperties;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

import javax.crypto.spec.SecretKeySpec;

/**
 * OAuth2 resource-server security.
 *
 * <p>Authentication is <b>optional but validated</b>: a request carrying a Bearer JWT is verified (a bad
 * token is rejected) and its claims populate the security context; a request without one proceeds as
 * anonymous. This keeps the console and simulator working while making real identity available.
 * <b>Authorization is enforced in the domain layer</b> ({@link CurrentUser}/{@code Entitlements}): the
 * fail-closed instance contract and tenant scoping. In production, swap the HMAC decoder for
 * {@code spring.security.oauth2.resourceserver.jwt.issuer-uri} and set {@code dev-default-user=false}.
 */
@Configuration
public class SecurityConfig {

    private final SecurityProperties props;
    private final CorsProperties corsProperties;

    public SecurityConfig(SecurityProperties props, CorsProperties corsProperties) {
        this.props = props;
        this.corsProperties = corsProperties;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Optional auth: no endpoint requires a token here; domain-layer entitlements enforce access.
                // A present token is still validated by the resource server (invalid -> 401).
                .authorizeHttpRequests(reg -> reg.anyRequest().permitAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> { }));
        return http.build();
    }

    private SecretKeySpec secretKey() {
        return new SecretKeySpec(props.jwtSecret().getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        return NimbusJwtDecoder.withSecretKey(secretKey())
                .macAlgorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256)
                .build();
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey()));
    }

    private CorsConfigurationSource corsConfigurationSource() {
        return HubCors.source(corsProperties);
    }
}
