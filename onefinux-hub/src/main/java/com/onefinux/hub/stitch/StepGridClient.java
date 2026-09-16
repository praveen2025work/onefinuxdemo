package com.onefinux.hub.stitch;

import com.onefinux.hub.config.OneFinUxProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

/**
 * HTTP fetch for kit-configured step grids. Only the simulator /sim surface is reachable.
 */
@Component
public class StepGridClient implements StepGridFetcher {

    private static final Logger log = LoggerFactory.getLogger(StepGridClient.class);

    private final RestClient rest;
    private final String simulatorUrl;

    public StepGridClient(RestClient.Builder builder, OneFinUxProperties properties) {
        this.rest = builder.build();
        this.simulatorUrl = properties == null || properties.simulatorUrl() == null
                ? "http://localhost:7081" : properties.simulatorUrl();
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> fetch(String endpoint, String method, Map<String, String> params) {
        String url = StepGridUrls.resolve(endpoint, simulatorUrl);
        String verb = method == null || method.isBlank() ? "GET" : method.trim().toUpperCase();
        Map<String, String> body = params == null ? Map.of() : params;
        try {
            if ("POST".equals(verb)) {
                Object payload = rest.post().uri(url)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(Map.class);
                return payload == null ? Map.of() : (Map<String, Object>) payload;
            }
            UriComponentsBuilder b = UriComponentsBuilder.fromUriString(url);
            body.forEach(b::queryParam);
            Object payload = rest.get().uri(b.build(true).toUri())
                    .retrieve()
                    .body(Map.class);
            return payload == null ? Map.of() : (Map<String, Object>) payload;
        } catch (Exception e) {
            log.warn("Step grid {} {} failed: {}", verb, url, e.getMessage());
            return Map.of("error", e.getMessage() == null ? "grid fetch failed" : e.getMessage());
        }
    }
}
