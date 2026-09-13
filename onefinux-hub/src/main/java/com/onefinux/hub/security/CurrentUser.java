package com.onefinux.hub.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;

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

    private final SecurityProperties props;

    public CurrentUser(SecurityProperties props) {
        this.props = props;
    }

    public Entitlements entitlements() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwtAuth) {
            Jwt jwt = jwtAuth.getToken();
            boolean superuser = Boolean.TRUE.equals(jwt.getClaim("superuser"));
            return new Entitlements(
                    jwt.getSubject(),
                    set(jwt.getClaimAsStringList("roles")),
                    set(jwt.getClaimAsStringList("groupUnits")),
                    set(jwt.getClaimAsStringList("ceesProducts")),
                    superuser);
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

    private static Set<String> set(List<String> values) {
        return values == null ? Set.of() : Set.copyOf(values);
    }
}
