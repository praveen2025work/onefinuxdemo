package com.onefinux.hub.workflow;

import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.ActionTarget;
import com.onefinux.hub.config.OneFinUxProperties.OnReady;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.TreeMap;

/**
 * {@code HTTP_COMMAND}: POST the command to a configured downstream target (Helix, Axiom, …). The target
 * reports back by publishing its completion event to the hub like any other source — no polling.
 */
@Component
public class HttpCommandExecutor implements ActionExecutor {

    private static final Logger log = LoggerFactory.getLogger(HttpCommandExecutor.class);

    private final RestClient rest;
    private final Map<String, ActionTarget> targets = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);

    public HttpCommandExecutor(RestClient.Builder restBuilder, OneFinUxProperties properties) {
        this.rest = restBuilder.build();
        this.targets.putAll(properties.actionTargets());
    }

    @Override
    public String type() {
        return "HTTP_COMMAND";
    }

    @Override
    public void execute(ActionCommand command, OnReady onReady) {
        String targetName = onReady.target();
        ActionTarget target = targetName == null ? null : targets.get(targetName);
        if (target == null || target.url() == null) {
            throw new IllegalStateException("no action target configured for '" + targetName + "'");
        }
        rest.post().uri(target.url()).contentType(MediaType.APPLICATION_JSON).body(command)
                .retrieve().toBodilessEntity();
        log.info("Sent {} for {} to {}", command.runId(), command.correlationId(), target.url());
    }
}
