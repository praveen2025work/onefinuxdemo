package com.onefinux.hub.workflow;

import com.onefinux.hub.config.OneFinUxProperties.OnReady;
import com.onefinux.hub.event.EventHubService;
import com.onefinux.hub.event.EventStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * {@code LOG_COMMAND}: a built-in stub capability. It records the command and immediately self-reports
 * completion by publishing the outcome's completion event, so a newly onboarded outcome can be folded
 * end-to-end before its real downstream is wired. It is the simplest proof that new action types plug in
 * through the {@link ActionExecutor} registry — config plus a bean, with no engine or dispatcher change.
 */
@Component
public class LogCommandExecutor implements ActionExecutor {

    private static final Logger log = LoggerFactory.getLogger(LogCommandExecutor.class);

    private final EventHubService hub;

    public LogCommandExecutor(EventHubService hub) {
        this.hub = hub;
    }

    @Override
    public String type() {
        return "LOG_COMMAND";
    }

    @Override
    public void execute(ActionCommand command, OnReady onReady) {
        String label = onReady.actionLabel() == null ? "Action" : onReady.actionLabel();
        log.info("LOG_COMMAND stub: {} run {} -> emitting completion event {}",
                command.outcomeId(), command.runId(), command.completionEvent());
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("correlationId", command.correlationId());
        attributes.put("outcomeId", command.outcomeId());
        attributes.put("runId", command.runId());
        attributes.put("summary", label + " completed by the built-in LOG_COMMAND stub");
        hub.publishInternal(command.completionEvent(), command.runId(), command.cobDate(), command.region(),
                EventStatus.COMPLETED, attributes);
    }
}
