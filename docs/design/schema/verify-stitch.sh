#!/usr/bin/env bash
# Load stitch DDL into an in-memory H2 and run the job queries.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
HUB="$ROOT/onefinux-hub"
OUT="${1:-/tmp/onefinux-stitch-verify.log}"

cd "$HUB"
mvn -q -DincludeScope=runtime dependency:build-classpath -Dmdep.outputFile=/tmp/onefinux-h2.cp
CP="$(cat /tmp/onefinux-h2.cp)"
H2_JAR="$(echo "$CP" | tr ':' '\n' | grep '/h2-' | head -n1)"
if [[ -z "$H2_JAR" ]]; then
  echo "h2 jar not on Maven classpath" >&2
  exit 1
fi

java -cp "$H2_JAR" org.h2.tools.RunScript \
  -url "jdbc:h2:mem:stitch;MODE=Oracle;DB_CLOSE_DELAY=-1" \
  -user sa \
  -script "$ROOT/docs/design/schema/onefinux-stitch.sql"

# Second pass: queries. Need a persisted mem DB — use file in /tmp instead.
rm -f /tmp/onefinux-stitch.mv.db /tmp/onefinux-stitch.trace.db
java -cp "$H2_JAR" org.h2.tools.RunScript \
  -url "jdbc:h2:file:/tmp/onefinux-stitch;MODE=Oracle" \
  -user sa \
  -script "$ROOT/docs/design/schema/onefinux-stitch.sql"

java -cp "$H2_JAR" org.h2.tools.RunScript \
  -url "jdbc:h2:file:/tmp/onefinux-stitch;MODE=Oracle" \
  -user sa \
  -script "$ROOT/docs/design/schema/onefinux-stitch-queries.sql" \
  -showResults > "$OUT"

echo "OK stitch verify → $OUT"
# Fail if seed instances are missing from query output
grep -q 'R-1042' "$OUT"
grep -q 'R-2031' "$OUT"
grep -q 'RUN-A37C' "$OUT"
grep -q 'MB014' "$OUT"
echo "OK seed keys present in query results"
