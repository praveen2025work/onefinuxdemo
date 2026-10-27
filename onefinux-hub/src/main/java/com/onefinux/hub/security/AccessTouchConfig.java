package com.onefinux.hub.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Every API call marks its user as seen in the {@link AccessRegistry}, which is what the inactivity rule measures.
 * A suspended user's calls are answered 403 with a reason, except the calls the console needs to show the lock
 * screen and file a request to get access back.
 */
@Configuration
public class AccessTouchConfig implements WebMvcConfigurer {

    private final CurrentUser currentUser;
    private final AccessRegistry access;

    public AccessTouchConfig(CurrentUser currentUser, AccessRegistry access) {
        this.currentUser = currentUser;
        this.access = access;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
                Entitlements ent = currentUser.entitlements();
                access.touch(ent.subject());
                if (!ent.suspended() || allowedWhileSuspended(req.getRequestURI())) return true;
                res.setStatus(403);
                res.setContentType("application/json");
                res.getWriter().write("{\"detail\":\"Access suspended after inactivity. Request access again on /access.\"}");
                return false;
            }
        }).addPathPatterns("/api/**");
    }

    static boolean allowedWhileSuspended(String uri) {
        return uri.startsWith("/api/auth/") || uri.startsWith("/api/access/requests") || uri.equals("/api/config");
    }
}
