package com.onefinux.hub.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Map;

/**
 * Security + entitlement configuration.
 *
 * <p>POC uses a symmetric (HMAC) JWT so the hub can both mint dev tokens and validate them without an
 * external IdP. In production this is replaced by {@code spring.security.oauth2.resourceserver.jwt.
 * issuer-uri} pointing at the bank IdP, and entitlements come from CEES rather than this file.
 *
 * <p>{@code devDefaultUser} controls the fail-open/closed posture: when true (default/dev) a request
 * with no token is treated as the named default principal so the console and simulator work without
 * login; set it false in production so unauthenticated access is denied (fail-closed).
 */
@ConfigurationProperties(prefix = "onefinux.security")
public record SecurityProperties(
        String jwtSecret,
        boolean devDefaultUser,
        String defaultUser,
        Integer tokenTtlMinutes,
        Map<String, DemoUser> users) {

    public SecurityProperties {
        jwtSecret = (jwtSecret == null || jwtSecret.isBlank())
                ? "onefinux-dev-signing-secret-please-override-in-prod-0123456789" : jwtSecret;
        defaultUser = defaultUser == null ? "praveen.kumar" : defaultUser;
        tokenTtlMinutes = tokenTtlMinutes == null ? 480 : tokenTtlMinutes;
        users = users == null ? Map.of() : Map.copyOf(users);
    }

    /** A named demo identity the dev-token endpoint can mint, with its entitlements. */
    public record DemoUser(List<String> roles, List<String> groupUnits, List<String> ceesProducts, boolean superuser) {
        public DemoUser {
            roles = roles == null ? List.of() : List.copyOf(roles);
            groupUnits = groupUnits == null ? List.of() : List.copyOf(groupUnits);
            ceesProducts = ceesProducts == null ? List.of() : List.copyOf(ceesProducts);
        }
    }
}
