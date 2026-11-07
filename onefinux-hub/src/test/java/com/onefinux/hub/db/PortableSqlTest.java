package com.onefinux.hub.db;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Main code must not use SQL that only H2 accepts. H2's Oracle mode still accepts most of these, so the
 * Oracle-mode boot test alone would not catch them.
 */
class PortableSqlTest {

    private static final List<Pattern> H2_ONLY = List.of(
            Pattern.compile("MERGE\\s+INTO\\s+\\w+(\\s*\\([^)]*\\))?\\s+KEY\\s*\\("),
            Pattern.compile("\\bLIMIT\\s+(:\\w+|\\d+|\\?)"),
            Pattern.compile("AS\\s+VARCHAR\\s*[()]"),
            Pattern.compile("(=|,|\\()\\s*(TRUE|FALSE)\\b(?![.(])"),
            Pattern.compile("\\bDATEADD\\s*\\("),
            Pattern.compile("INSERT INTO audit_log \\([^)]*\\bresource\\b"),
            Pattern.compile("(?<![\"\\w])resource AS \"resource\""),
            Pattern.compile("WHERE resource ="));

    @Test
    @DisplayName("AC-OPERATE-31 main code has no H2-only SQL (MERGE ... KEY, LIMIT, CAST AS VARCHAR, boolean literals, DATEADD)")
    void no_h2_only_sql_in_main_code() throws IOException {
        List<String> found = new ArrayList<>();
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            for (Path f : files.filter(p -> p.toString().endsWith(".java")).toList()) {
                String src = Files.readString(f).replaceAll("(?s)/\\*.*?\\*/", "").replaceAll("(?m)//.*$", "");
                for (Pattern p : H2_ONLY) {
                    var m = p.matcher(src);
                    while (m.find()) {
                        if (!m.group().contains("Boolean.")) {
                            found.add(f + ": " + m.group().replaceAll("\\s+", " "));
                        }
                    }
                }
            }
        }
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("AC-OPERATE-32 every H2 migration has an Oracle migration with the same version")
    void every_h2_migration_has_an_oracle_twin() throws IOException {
        Path h2 = Path.of("src/main/resources/db/migration");
        Path oracle = Path.of("src/main/resources/db/oracle");
        try (Stream<Path> files = Files.list(h2)) {
            List<String> missing = files.map(p -> p.getFileName().toString()).filter(n -> n.matches("V\\d+__.*\\.sql"))
                    .filter(n -> !Files.exists(oracle.resolve(n))).toList();
            assertThat(missing).isEmpty();
        }
    }
}
