package com.onefinux.hub.security;

import java.util.Set;

/**
 * The resolved identity + entitlements for the current request. {@code superuser} short-circuits all
 * checks (platform admin / dev default). Otherwise access is granted only to the listed group units and
 * CEES products — the basis for tenant scoping and the fail-closed instance contract.
 *
 * <p>{@code actions} are the verbs the user's roles allow under the role structure ({@code onefinux.security.
 * role-actions}); {@code null} means no structure applies. {@code suspended} is set when access was suspended for
 * inactivity: the user is denied everything until access is restored.
 */
public record Entitlements(String subject, Set<String> roles, Set<String> groupUnits,
                           Set<String> ceesProducts, boolean superuser, Set<String> actions, boolean suspended) {

    public Entitlements(String subject, Set<String> roles, Set<String> groupUnits, Set<String> ceesProducts,
                        boolean superuser) {
        this(subject, roles, groupUnits, ceesProducts, superuser, null, false);
    }

    /** True when the role structure lets this user perform the verb (SIGN_OFF, POST, REPLAY …). */
    public boolean canAct(String action) {
        return superuser || actions == null || actions.contains(action);
    }

    public boolean canSeeGroupUnit(String groupUnitId) {
        return superuser || (groupUnitId != null && groupUnits.contains(groupUnitId));
    }

    public boolean hasRole(String role) {
        return superuser || roles.contains(role);
    }

    public static Entitlements deny(String subject) {
        return new Entitlements(subject, Set.of(), Set.of(), Set.of(), false, Set.of(), false);
    }

    public static Entitlements suspended(String subject) {
        return new Entitlements(subject, Set.of(), Set.of(), Set.of(), false, Set.of(), true);
    }
}
