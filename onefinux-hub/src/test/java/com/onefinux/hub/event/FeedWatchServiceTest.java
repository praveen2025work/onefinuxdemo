package com.onefinux.hub.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.onefinux.hub.config.FeedWatchProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeedWatchServiceTest {

    @TempDir
    Path tmp;

    private final ObjectMapper mapper = JsonMapper.builder().addModule(new JavaTimeModule()).build();

    @Test
    @DisplayName("AC-INGEST-15 valid feed file is ingested and moved to processed")
    void valid_file_is_ingested_and_processed() throws Exception {
        EventHubService hub = mock(EventHubService.class);
        when(hub.ingest(any())).thenReturn(new IngestResult("E-FEED", "ACCEPTED", "LEDGER", "MB014"));
        FeedWatchService watch = service(hub);
        Path file = inbox().resolve("motif-mb014.json");
        Files.writeString(file, """
                {"eventId":"E-FEED","eventType":"LEDGER_REJECTED","sourceSystem":"MOTIF","sourceKey":"MB014",
                 "cobDate":"2026-09-12","region":"EMEA","status":"FAILED"}
                """);

        int n = watch.scan();

        assertThat(n).isEqualTo(1);
        verify(hub).ingest(any(InboundEvent.class));
        assertThat(Files.exists(file)).isFalse();
        assertThat(Files.exists(processed().resolve("motif-mb014.json"))).isTrue();
        assertThat(Files.exists(rejected().resolve("motif-mb014.json"))).isFalse();
    }

    @Test
    @DisplayName("AC-INGEST-16 invalid feed file is rejected and not persisted")
    void invalid_file_goes_to_rejected() throws Exception {
        EventHubService hub = mock(EventHubService.class);
        FeedWatchService watch = service(hub);
        Path file = inbox().resolve("bad.json");
        Files.writeString(file, "{\"eventType\":\"NOPE\"}");

        int n = watch.scan();

        assertThat(n).isEqualTo(0);
        verify(hub, never()).ingest(any());
        assertThat(Files.exists(rejected().resolve("bad.json"))).isTrue();
        assertThat(Files.exists(file)).isFalse();
    }

    private FeedWatchService service(EventHubService hub) {
        FeedWatchProperties cfg = new FeedWatchProperties(true, inbox().toString(), processed().toString(), rejected().toString(), 1000);
        return new FeedWatchService(cfg, new EventBinder(mapper, new EventContractValidator()), hub, mapper);
    }

    private Path inbox() { return tmp.resolve("inbox"); }
    private Path processed() { return tmp.resolve("processed"); }
    private Path rejected() { return tmp.resolve("rejected"); }
}
