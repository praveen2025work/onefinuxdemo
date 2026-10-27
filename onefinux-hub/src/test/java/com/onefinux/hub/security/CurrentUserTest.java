package com.onefinux.hub.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CurrentUserTest {

    static final Map<String, List<String>> STRUCTURE = Map.of(
            "ADMIN", List.of("SIGN_OFF", "ACCESS_APPROVE"), "CONTROLLER", List.of("SIGN_OFF", "POST"), "AUDIT", List.of("ACCESS_REVIEW"));

    AccessRegistry access = mock(AccessRegistry.class);

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    CurrentUser user(boolean requireMfa) {
        SecurityProperties props = new SecurityProperties(null, true, null, null, null, null,
                new SecurityProperties.Oidc("https://idp.bank.local", "console", null, null, null, null), STRUCTURE, null, null, requireMfa);
        when(access.snapshot(anyString())).thenReturn(AccessRegistry.Snapshot.NONE);
        return new CurrentUser(props, access);
    }

    void token(String issuer, Map<String, Object> claims) {
        Jwt.Builder b = Jwt.withTokenValue("t").header("alg", "none").issuer(issuer).subject("alice")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60));
        claims.forEach(b::claim);
        SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(b.build()));
    }

    @Test
    void rolesOutsideTheStructureAreDroppedAndVerbsFollowRoles() {
        CurrentUser u = user(false);
        token(CurrentUser.DEV_ISSUER, Map.of("roles", List.of("CONTROLLER", "WIZARD"), "groupUnits", List.of("REV-ACC")));
        Entitlements e = u.entitlements();
        assertThat(e.roles()).containsExactly("CONTROLLER");
        assertThat(e.canAct("POST")).isTrue();
        assertThat(e.canAct("ACCESS_APPROVE")).isFalse();
    }

    @Test
    void superuserNeedsTheAdminRole() {
        CurrentUser u = user(false);
        token(CurrentUser.DEV_ISSUER, Map.of("roles", List.of("CONTROLLER"), "superuser", true));
        assertThat(u.entitlements().superuser()).isFalse();
    }

    @Test
    void grantsAddToTheTokenAndSuspensionDeniesEverything() {
        CurrentUser u = user(false);
        when(access.snapshot("alice")).thenReturn(new AccessRegistry.Snapshot(Set.of("AUDIT"), Set.of("MARKETS"), Set.of(), false));
        token(CurrentUser.DEV_ISSUER, Map.of("roles", List.of("CONTROLLER"), "groupUnits", List.of("REV-ACC")));
        Entitlements e = u.entitlements();
        assertThat(e.groupUnits()).containsExactlyInAnyOrder("REV-ACC", "MARKETS");
        assertThat(e.canAct("ACCESS_REVIEW")).isTrue();

        when(access.snapshot("alice")).thenReturn(new AccessRegistry.Snapshot(Set.of(), Set.of(), Set.of(), true));
        Entitlements s = u.entitlements();
        assertThat(s.suspended()).isTrue();
        assertThat(s.canSeeGroupUnit("REV-ACC")).isFalse();
    }

    @Test
    void ssoTokensWithoutASecondFactorAreDeniedWhenMfaIsRequired() {
        CurrentUser u = user(true);
        token("https://idp.bank.local", Map.of("roles", List.of("CONTROLLER"), "groupUnits", List.of("REV-ACC"), "amr", List.of("pwd")));
        assertThat(u.entitlements().groupUnits()).isEmpty();
        token("https://idp.bank.local", Map.of("roles", List.of("CONTROLLER"), "groupUnits", List.of("REV-ACC"), "amr", List.of("pwd", "otp")));
        assertThat(u.entitlements().groupUnits()).containsExactly("REV-ACC");
    }

    @Test
    void entitlementsWithoutAStructureAllowEveryVerb() {
        assertThat(new Entitlements("x", Set.of(), Set.of(), Set.of(), false).canAct("ANYTHING")).isTrue();
        assertThat(AccessTouchConfig.allowedWhileSuspended("/api/access/requests")).isTrue();
        assertThat(AccessTouchConfig.allowedWhileSuspended("/api/stitch/instances")).isFalse();
    }
}
