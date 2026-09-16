package com.onefinux.hub.notification;

import com.onefinux.hub.config.OneFinUxProperties;
import com.onefinux.hub.config.OneFinUxProperties.Notifications;
import com.onefinux.hub.outcome.Severity;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class WindowsToastChannelTest {

    @TempDir
    Path tmp;

    @Test
    void disabledWhenNotWindows() {
        Path script = tmp.resolve("show-toast.ps1");
        WindowsToastChannel ch = channel(true, false, script, args -> 0);
        assertThat(ch.enabled()).isFalse();
        assertThat(ch.name()).isEqualTo("windows-toast");
    }

    @Test
    void disabledWhenFlagOffEvenOnWindows() throws Exception {
        Path script = Files.writeString(tmp.resolve("show-toast.ps1"), "# toast");
        WindowsToastChannel ch = channel(false, true, script, args -> 0);
        assertThat(ch.enabled()).isFalse();
    }

    @Test
    void disabledWhenScriptMissing() {
        WindowsToastChannel ch = channel(true, true, tmp.resolve("missing.ps1"), args -> 0);
        assertThat(ch.enabled()).isFalse();
    }

    @Test
    void launchesPowershellWithTitleAndMessage() throws Exception {
        Path script = Files.writeString(tmp.resolve("show-toast.ps1"), "# toast");
        List<String> seen = new ArrayList<>();
        AtomicInteger starts = new AtomicInteger();
        WindowsToastChannel ch = channel(true, true, script, args -> {
            seen.addAll(args);
            starts.incrementAndGet();
            return 0;
        });
        assertThat(ch.enabled()).isTrue();

        ch.deliver(new NotificationView(1L, Instant.parse("2026-09-16T00:00:00Z"), Severity.SUCCESS,
                "READY", "FOBO_HELIX", "FOBO investigation", "FOBO Controllers",
                "FOBO is READY", "Helix can run for GLOBAL / 2026-09-16", "windows-toast"));

        assertThat(starts).hasValue(1);
        assertThat(seen).contains("powershell.exe", "-File", script.toAbsolutePath().toString());
        assertThat(seen).contains("-Title", "FOBO is READY");
        assertThat(seen).contains("-Message", "Helix can run for GLOBAL / 2026-09-16");
        assertThat(seen).contains("-Severity", "SUCCESS");
    }

    private static WindowsToastChannel channel(boolean toastFlag, boolean windows, Path script,
                                               WindowsToastChannel.ProcessRunner runner) {
        OneFinUxProperties props = new OneFinUxProperties(null, null, null, null, null, null,
                new Notifications(null, true, null, toastFlag));
        return new WindowsToastChannel(props, () -> windows, runner, script);
    }
}
