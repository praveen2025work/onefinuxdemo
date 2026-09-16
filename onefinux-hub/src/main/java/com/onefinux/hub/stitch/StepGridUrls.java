package com.onefinux.hub.stitch;

import java.net.URI;
import java.util.Locale;

/**
 * Step grids call the simulator only. Relative paths must stay under /sim; absolute URLs must match
 * the configured simulator host. This is the SSRF fence for kit_destination.grid_endpoint.
 */
public final class StepGridUrls {

    private StepGridUrls() {
    }

    public static String resolve(String endpoint, String simulatorBase) {
        String path = endpoint == null ? "" : endpoint.trim();
        if (path.isEmpty()) {
            throw new IllegalArgumentException("grid endpoint is required");
        }
        String base = simulatorBase == null || simulatorBase.isBlank()
                ? "http://localhost:7081" : simulatorBase.trim();
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (path.startsWith("/")) {
            requireSimPath(path);
            return base + path;
        }
        URI uri = URI.create(path);
        URI sim = URI.create(base);
        if (!sameOrigin(uri, sim)) {
            throw new IllegalArgumentException("grid endpoint host is not the configured simulator");
        }
        requireSimPath(uri.getPath() == null ? "" : uri.getPath());
        return path;
    }

    private static void requireSimPath(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (!p.startsWith("/sim/")) {
            throw new IllegalArgumentException("grid endpoint must be a /sim path");
        }
    }

    private static boolean sameOrigin(URI a, URI b) {
        String hostA = a.getHost() == null ? "" : a.getHost();
        String hostB = b.getHost() == null ? "" : b.getHost();
        int portA = a.getPort() <= 0 ? defaultPort(a) : a.getPort();
        int portB = b.getPort() <= 0 ? defaultPort(b) : b.getPort();
        String schemeA = a.getScheme() == null ? "http" : a.getScheme();
        String schemeB = b.getScheme() == null ? "http" : b.getScheme();
        return schemeA.equalsIgnoreCase(schemeB) && hostA.equalsIgnoreCase(hostB) && portA == portB;
    }

    private static int defaultPort(URI uri) {
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }
}
