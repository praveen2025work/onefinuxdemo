package com.onefinux.hub.security;

import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Dev identity helper. Mints short-lived JWTs for the configured demo users so entitlement/tenant
 * behaviour can be exercised without a real IdP. In production this endpoint does not exist; tokens come
 * from the bank IdP (issuer-uri) and entitlements from CEES.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtEncoder encoder;
    private final SecurityProperties props;
    private final CurrentUser currentUser;

    public AuthController(JwtEncoder encoder, SecurityProperties props, CurrentUser currentUser) {
        this.encoder = encoder;
        this.props = props;
        this.currentUser = currentUser;
    }

    /** The demo identities available to mint tokens for. */
    @GetMapping("/users")
    public List<Map<String, Object>> users() {
        return props.users().entrySet().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("user", e.getKey());
            m.put("roles", e.getValue().roles());
            m.put("groupUnits", e.getValue().groupUnits());
            m.put("superuser", e.getValue().superuser());
            return m;
        }).toList();
    }

    /** Current resolved identity + entitlements (honours a Bearer token if presented). */
    @GetMapping("/whoami")
    public Entitlements whoami() {
        return currentUser.entitlements();
    }

    @PostMapping("/dev-token")
    public ResponseEntity<Map<String, Object>> devToken(@RequestParam String user) {
        SecurityProperties.DemoUser demo = props.users().get(user);
        if (demo == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "unknown user", "available", props.users().keySet()));
        }
        Instant now = Instant.now();
        Instant exp = now.plus(Duration.ofMinutes(props.tokenTtlMinutes()));
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("onefinux-dev")
                .issuedAt(now)
                .expiresAt(exp)
                .subject(user)
                .claim("roles", demo.roles())
                .claim("groupUnits", demo.groupUnits())
                .claim("ceesProducts", demo.ceesProducts())
                .claim("superuser", demo.superuser())
                .build();
        String token = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return ResponseEntity.ok(Map.of(
                "access_token", token,
                "token_type", "Bearer",
                "expires_in", Duration.between(now, exp).toSeconds(),
                "subject", user,
                "superuser", demo.superuser(),
                "groupUnits", demo.groupUnits()));
    }
}
