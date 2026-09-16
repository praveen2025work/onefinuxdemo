package com.onefinux.hub.stitch;

import java.util.Map;

/** Fetches a configured step-grid payload. Tests inject a stub; production uses StepGridClient. */
@FunctionalInterface
public interface StepGridFetcher {

    Map<String, Object> fetch(String endpoint, String method, Map<String, String> params);

    StepGridFetcher NONE = (endpoint, method, params) -> Map.of();
}
