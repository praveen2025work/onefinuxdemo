package com.onefinux.hub.event;

import com.fasterxml.jackson.annotation.JsonIgnore;

public record IngestResult(String eventId, String result, String businessIdType, String businessId) {

    static IngestResult accepted(BusinessEvent event) {
        return new IngestResult(event.eventId(), "ACCEPTED", event.businessIdType(), event.businessId());
    }

    static IngestResult duplicate(String eventId) {
        return new IngestResult(eventId, "DUPLICATE", null, null);
    }

    @JsonIgnore
    public boolean isDuplicate() {
        return "DUPLICATE".equals(result);
    }
}
