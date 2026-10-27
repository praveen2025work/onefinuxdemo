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

    /**
     * Demo tokens (issuer {@value CurrentUser#DEV_ISSUER}) are checked with the shared secret, and only while demo
     * tokens are enabled. Tokens from the configured identity provider are checked against its published keys,
     * looked up on first use so the hub starts even when the IdP is briefly unreachable.
     */
    @Bean
    public JwtDecoder jwtDecoder() {
        JwtDecoder dev = NimbusJwtDecoder.withSecretKey(secretKey())
                .macAlgorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256)
                .build();
        SecurityProperties.Oidc oidc = props.oidc();
        java.util.concurrent.atomic.AtomicReference<JwtDecoder> sso = new java.util.concurrent.atomic.AtomicReference<>();
        return token -> {
            String issuer = issuerOf(token);
            if (oidc.enabled() && oidc.issuer().equals(issuer)) {
                JwtDecoder d = sso.updateAndGet(cur -> cur != null ? cur : ssoDecoder(oidc));
                return d.decode(token);
            }
            if (!props.devTokens()) {
                throw new org.springframework.security.oauth2.jwt.BadJwtException("demo tokens are disabled; sign in through SSO");
            }
            return dev.decode(token);
        };
    }

    private static JwtDecoder ssoDecoder(SecurityProperties.Oidc oidc) {
        NimbusJwtDecoder d = (NimbusJwtDecoder) org.springframework.security.oauth2.jwt.JwtDecoders.fromIssuerLocation(oidc.issuer());
        java.util.List<org.springframework.security.oauth2.core.OAuth2TokenValidator<org.springframework.security.oauth2.jwt.Jwt>> checks =
                new java.util.ArrayList<>(java.util.List.of(org.springframework.security.oauth2.jwt.JwtValidators.createDefaultWithIssuer(oidc.issuer())));
        if (oidc.audience() != null && !oidc.audience().isBlank()) {
            checks.add(new org.springframework.security.oauth2.jwt.JwtClaimValidator<java.util.List<String>>("aud",
                    aud -> aud != null && aud.contains(oidc.audience())));
        }
        d.setJwtValidator(new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(checks));
        return d;
    }

    static String issuerOf(String token) {
        try {
            return com.nimbusds.jwt.JWTParser.parse(token).getJWTClaimsSet().getIssuer();
        } catch (Exception e) {
            throw new org.springframework.security.oauth2.jwt.BadJwtException("not a JWT");
        }
    }

    /**
     * A hub that refuses anonymous access is a production hub: it must not sign or accept tokens with the demo
     * secret. Fail at start rather than run open.
     */
    @jakarta.annotation.PostConstruct
    void refuseDemoSecretInProduction() {
        if (!props.devDefaultUser() && props.devTokens() && SecurityProperties.DEMO_SECRET.equals(props.jwtSecret())) {
            throw new IllegalStateException("onefinux.security: dev-default-user is false but demo tokens still use the demo "
                    + "secret. Set ONEFINUX_JWT_SECRET, or set dev-tokens: false and configure oidc.issuer.");
        }
    }

    @Bean
    public JwtEncoder jwtEncoder() {
        return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey()));
    }

    private CorsConfigurationSource corsConfigurationSource() {
        return HubCors.source(corsProperties);
    }
}
