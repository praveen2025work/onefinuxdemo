package com.onefinux.hub.event;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EventBinderTest {

    private final ObjectMapper mapper = JsonMapper.builder().addModule(new JavaTimeModule()).build();
    private final EventBinder binder = new EventBinder(mapper, new EventContractValidator());

    @Test
    @DisplayName("AC-INGEST-01 API inbound-event-v1 binds and stamps ingestChannel API")
    void api_contract_stamps_api_channel() throws Exception {
        JsonNode body = mapper.readTree("""
                {"eventType":"TRADE_BOOKED","sourceSystem":"CATS","sourceKey":"TR-8812",
                 "cobDate":"2026-09-12","region":"APAC","status":"COMPLETED",
                 "attributes":{"instanceId":"FOBO|2026-09-12|APAC|R-1042"}}
                """);
        InboundEvent in = binder.bind(body, "API");
        assertThat(in.eventType()).isEqualTo("TRADE_BOOKED");
        assertThat(in.sourceSystem()).isEqualTo("CATS");
        assertThat(in.attributes()).containsEntry("ingestChannel", "API");
        assertThat(in.attributes()).containsEntry("instanceId", "FOBO|2026-09-12|APAC|R-1042");
    }

    @Test
    @DisplayName("AC-INGEST-15 feed-event-v1 unwraps data and stamps ingestChannel FEED")
    void feed_envelope_unwraps_to_inbound() throws Exception {
        JsonNode body = mapper.readTree("""
                {"specversion":"1.0","id":"feed-1","source":"cats","type":"onefinux.fact.v1",
                 "time":"2026-09-12T20:14:03Z","datacontenttype":"application/json",
                 "data":{"eventType":"TRADE_BOOKED","sourceSystem":"CATS","sourceKey":"TR-8812",
                         "cobDate":"2026-09-12","region":"APAC","status":"COMPLETED"}}
                """);
        InboundEvent in = binder.bind(body, "FEED");
        assertThat(in.eventType()).isEqualTo("TRADE_BOOKED");
        assertThat(in.sourceKey()).isEqualTo("TR-8812");
        assertThat(in.attributes()).containsEntry("ingestChannel", "FEED");
    }

    @Test
    @DisplayName("AC-INGEST-16 feed file that is raw inbound-event-v1 is accepted as FEED")
    void feed_raw_inbound_file() throws Exception {
        JsonNode body = mapper.readTree("""
                {"eventId":"E-FEED","eventType":"LEDGER_REJECTED","sourceSystem":"MOTIF","sourceKey":"MB014",
                 "cobDate":"2026-09-12","region":"EMEA","status":"FAILED"}
                """);
        InboundEvent in = binder.bind(body, "FEED");
        assertThat(in.eventId()).isEqualTo("E-FEED");
        assertThat(in.status()).isEqualTo(EventStatus.FAILED);
        assertThat(in.attributes()).isEqualTo(Map.of("ingestChannel", "FEED"));
    }

    @Test
    @DisplayName("AC-INGEST-03 missing required field fails the contract")
    void missing_field_is_rejected() throws Exception {
        JsonNode body = mapper.readTree("""
                {"eventType":"TRADE_BOOKED","sourceSystem":"CATS"}
                """);
        assertThatThrownBy(() -> binder.bind(body, "API")).isInstanceOf(EventContractException.class);
    }
}
