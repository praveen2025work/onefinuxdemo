package com.onefinux.hub.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Resolves the current principal's {@link Entitlements} from the security context.
 *
 * <ul>
 *   <li>Bearer JWT present → entitlements come from its claims (subject, roles, groupUnits, ceesProducts,
 *       superuser).</li>
 *   <li>No token → in dev ({@code onefinux.security.dev-default-user=true}) the configured default user is
 *       assumed as a superuser so the console/simulator work without login; in production it is a
 *       deny-all identity (fail-closed).</li>
 * </ul>
 */
@Component
public class CurrentUser {

    /** Issuer of the hub's own demo tokens; SSO tokens carry the bank IdP's issuer. */
    public static final String DEV_ISSUER = "onefinux-dev";

    private final SecurityProperties props;
    private final AccessRegistry access;

    public CurrentUser(SecurityProperties props, AccessRegistry access) {
        this.props = props;
        this.access = access;
    }

    /**
     * Token claims, plus access granted through approved requests, shaped by the role structure: only roles the
     * structure defines count, {@code superuser} needs the ADMIN role, and the allowed verbs follow from the roles
     * (so a role change in the IdP changes what the user can do on the next request). A user suspended for
     * inactivity, or an SSO token without multi-factor proof when MFA is required, gets no access.
     */
    public Entitlements entitlements() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            String subject = jwt.getSubject();
            String issuer = jwt.getClaimAsString("iss");
            boolean sso = issuer != null && !DEV_ISSUER.equals(issuer);
            if (sso && props.requireMfa() && !hasMfa(jwt)) {
                return Entitlements.deny(subject);
            }
            AccessRegistry.Snapshot granted = access == null ? AccessRegistry.Snapshot.NONE : access.snapshot(subject);
            if (granted.suspended()) {
                return Entitlements.suspended(subject);
            }
            SecurityProperties.Oidc oidc = props.oidc();
            Set<String> roles = inStructure(granted.joinRoles(set(jwt.getClaimAsStringList(sso ? oidc.rolesClaim() : "roles"))));
            Set<String> units = AccessRegistry.Snapshot.union(
                    set(jwt.getClaimAsStringList(sso ? oidc.groupUnitsClaim() : "groupUnits")), granted.groupUnits());
            Set<String> cees = AccessRegistry.Snapshot.union(set(jwt.getClaimAsStringList("ceesProducts")), granted.ceesProducts());
            boolean superuser = Boolean.TRUE.equals(jwt.getClaim("superuser")) && roles.contains("ADMIN");
            return new Entitlements(subject, roles, units, cees, superuser, actionsFor(roles), false);
        }
        // No authenticated token.
        if (props.devDefaultUser()) {
            return new Entitlements(props.defaultUser(), Set.of("ADMIN"), Set.of(), Set.of(), true);
        }
        return Entitlements.deny("anonymous");
    }

    /** The audit actor for the current request — always the real principal, never client-supplied. */
    public String actor() {
        return entitlements().subject();
    }

    /** Roles outside the structure are dropped; with no structure configured every role counts. */
    Set<String> inStructure(Set<String> roles) {
        if (props.roleActions().isEmpty()) return roles;
        return roles.stream().filter(props.roleActions()::containsKey).collect(Collectors.toUnmodifiableSet());
    }

    Set<String> actionsFor(Set<String> roles) {
        if (props.roleActions().isEmpty()) return null;
        return roles.stream().flatMap(r -> props.roleActions().getOrDefault(r, List.of()).stream())
                .collect(Collectors.toUnmodifiableSet());
    }

    /** OIDC {@code amr} (authentication methods) shows a second factor: mfa, otp, hwk, sms, swk or fpt. */
    static boolean hasMfa(Jwt jwt) {
        List<String> amr = jwt.getClaimAsStringList("amr");
        if (amr == null) return false;
        return amr.stream().anyMatch(m -> Set.of("mfa", "otp", "hwk", "sms", "swk", "fpt").contains(m.toLowerCase()));
    }

    private static Set<String> set(List<String> values) {
        return values == null ? Set.of() : Set.copyOf(values);
    }
}
