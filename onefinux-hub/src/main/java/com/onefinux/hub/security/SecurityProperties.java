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
        Map<String, DemoUser> users,
        Boolean devTokens,
        Oidc oidc,
        Map<String, List<String>> roleActions,
        Integer inactivityDays,
        Integer idleLockMinutes,
        boolean requireMfa) {

    /** The demo signing secret. A hub that refuses anonymous access must not run with it. */
    public static final String DEMO_SECRET = "onefinux-dev-signing-secret-please-override-in-prod-0123456789";

    public SecurityProperties {
        jwtSecret = (jwtSecret == null || jwtSecret.isBlank()) ? DEMO_SECRET : jwtSecret;
        defaultUser = defaultUser == null ? "praveen.kumar" : defaultUser;
        tokenTtlMinutes = tokenTtlMinutes == null ? 480 : tokenTtlMinutes;
        users = users == null ? Map.of() : Map.copyOf(users);
        devTokens = devTokens == null ? devDefaultUser : devTokens;
        oidc = oidc == null ? new Oidc(null, null, null, null, null, null) : oidc;
        roleActions = roleActions == null ? Map.of() : Map.copyOf(roleActions);
        inactivityDays = inactivityDays == null ? 90 : inactivityDays;
        idleLockMinutes = idleLockMinutes == null ? 15 : idleLockMinutes;
    }

    /**
     * Single sign-on against the bank identity provider (OpenID Connect, authorization code + PKCE in the browser).
     * With an issuer set, the hub validates that issuer's tokens from its published keys; the console signs users in
     * there. Claim names say where roles and group units sit in the IdP's token.
     */
    public record Oidc(String issuer, String clientId, String scope, String audience, String rolesClaim,
                       String groupUnitsClaim) {
        public Oidc {
            scope = scope == null || scope.isBlank() ? "openid profile email" : scope;
            rolesClaim = rolesClaim == null || rolesClaim.isBlank() ? "roles" : rolesClaim;
            groupUnitsClaim = groupUnitsClaim == null || groupUnitsClaim.isBlank() ? "groupUnits" : groupUnitsClaim;
        }

        public boolean enabled() {
            return issuer != null && !issuer.isBlank();
        }
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
