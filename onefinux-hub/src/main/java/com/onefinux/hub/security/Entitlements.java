package com.onefinux.hub.security;

import java.util.Set;

/**
 * The resolved identity + entitlements for the current request. {@code superuser} short-circuits all
 * checks (platform admin / dev default). Otherwise access is granted only to the listed group units and
 * CEES products — the basis for tenant scoping and the fail-closed instance contract.
 */
public record Entitlements(String subject, Set<String> roles, Set<String> groupUnits,
                           Set<String> ceesProducts, boolean superuser) {

    public boolean canSeeGroupUnit(String groupUnitId) {
        return superuser || (groupUnitId != null && groupUnits.contains(groupUnitId));
    }

    public boolean hasRole(String role) {
        return superuser || roles.contains(role);
    }

    public static Entitlements deny(String subject) {
        return new Entitlements(subject, Set.of(), Set.of(), Set.of(), false);
    }
}
