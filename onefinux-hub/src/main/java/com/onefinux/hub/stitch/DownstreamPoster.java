package com.onefinux.hub.stitch;

import java.util.Map;

/** Best-effort HTTP post to a downstream command URL (FAS adjust, later others). */
@FunctionalInterface
public interface DownstreamPoster {
    void post(String url, Map<String, Object> body);
}
