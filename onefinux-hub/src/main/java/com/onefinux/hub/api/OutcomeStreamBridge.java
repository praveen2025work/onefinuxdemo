package com.onefinux.hub.api;

import com.onefinux.hub.outcome.OutcomeChanged;
import com.onefinux.hub.stream.StreamHub;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/** Every outcome change refreshes the board, notifiable or not. */
@Component
class OutcomeStreamBridge {

    private final StreamHub stream;

    OutcomeStreamBridge(StreamHub stream) {
        this.stream = stream;
    }

    @EventListener
    void onOutcomeChanged(OutcomeChanged change) {
        stream.broadcast("outcome", change.view());
    }
}
