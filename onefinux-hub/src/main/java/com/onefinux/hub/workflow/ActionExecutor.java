package com.onefinux.hub.workflow;

import com.onefinux.hub.config.OneFinUxProperties.OnReady;

/**
 * A pluggable on-ready capability. When an outcome becomes READY, {@link ActionDispatcher} looks up the
 * executor whose {@link #type()} matches the outcome's {@code onReady.action} and runs it. Launching a
 * new kind of action (HTTP command, internal handoff, message publish, stub, …) is therefore adding one
 * Spring bean plus a line of config — the engine and dispatcher never change.
 */
public interface ActionExecutor {

    /** The {@code onReady.action} value this executor handles, e.g. {@code "HTTP_COMMAND"} (case-insensitive). */
    String type();

    /**
     * Perform the action for a ready outcome. Throw to signal failure; the dispatcher publishes an
     * {@code ACTION_FAILED} workflow event so the outcome shows the failure and can be re-run.
     */
    void execute(ActionCommand command, OnReady onReady) throws Exception;
}
