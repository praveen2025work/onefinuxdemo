package com.onefinux.hub.notification;

import com.onefinux.hub.config.OneFinUxProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.function.BooleanSupplier;

/**
 * Windows Action Center toast — the same corner of the desktop Outlook uses for new mail.
 * Not the in-browser bell. Off unless the OS is Windows, the flag is on, and
 * {@code scripts/windows/show-toast.ps1} is present (NSSM AppDirectory / run.cmd cwd = repo root).
 */
@Component
class WindowsToastChannel implements NotificationChannel {

    private static final Logger log = LoggerFactory.getLogger(WindowsToastChannel.class);

    @FunctionalInterface
    interface ProcessRunner {
        int run(List<String> command) throws IOException;
    }

    private final boolean flag;
    private final BooleanSupplier windows;
    private final ProcessRunner runner;
    private final Path script;

    WindowsToastChannel(OneFinUxProperties properties) {
        this(properties,
                () -> System.getProperty("os.name", "").toLowerCase().contains("win"),
                WindowsToastChannel::spawn,
                Path.of("scripts", "windows", "show-toast.ps1"));
    }

    WindowsToastChannel(OneFinUxProperties properties, BooleanSupplier windows, ProcessRunner runner, Path script) {
        this.flag = properties.notifications().windowsToastEnabled();
        this.windows = windows;
        this.runner = runner;
        this.script = script;
    }

    @Override
    public String name() {
        return "windows-toast";
    }

    @Override
    public boolean enabled() {
        return flag && windows.getAsBoolean() && Files.isRegularFile(script);
    }

    @Override
    public void deliver(NotificationView n) {
        List<String> command = List.of(
                "powershell.exe",
                "-NoProfile",
                "-ExecutionPolicy", "Bypass",
                "-WindowStyle", "Hidden",
                "-File", script.toAbsolutePath().toString(),
                "-Title", clean(n.title()),
                "-Message", clean(n.message()),
                "-Severity", n.severity() == null ? "INFO" : n.severity().name());
        try {
            runner.run(command);
        } catch (Exception e) {
            log.warn("Windows toast failed for notification {}: {}", n.id(), e.getMessage());
        }
    }

    private static String clean(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\"", "'");
    }

    private static int spawn(List<String> command) throws IOException {
        new ProcessBuilder(command).redirectErrorStream(true).start();
        return 0;
    }
}
