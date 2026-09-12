#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap: ensure Maven 3.9+ is available (the base
# image already ships Java 21), then build both modules and run the tests.
set -euo pipefail
cd "$(dirname "$0")/.."

MVN_VERSION="3.9.9"
MVN_DIR="$HOME/.local/apache-maven-${MVN_VERSION}"
MVN_BIN="$MVN_DIR/bin/mvn"

if command -v mvn >/dev/null 2>&1; then
  MVN="$(command -v mvn)"
elif [ -x "$MVN_BIN" ]; then
  MVN="$MVN_BIN"
else
  echo "Installing Apache Maven ${MVN_VERSION} into ${MVN_DIR}..."
  mkdir -p "$HOME/.local"
  curl -fsSL -o /tmp/maven.tar.gz \
    "https://archive.apache.org/dist/maven/maven-3/${MVN_VERSION}/binaries/apache-maven-${MVN_VERSION}-bin.tar.gz"
  tar -xzf /tmp/maven.tar.gz -C "$HOME/.local"
  rm -f /tmp/maven.tar.gz
  # Best-effort: expose `mvn` on PATH for interactive shells. Ignored where not permitted.
  if command -v sudo >/dev/null 2>&1; then
    sudo ln -sfn "$MVN_DIR/bin/mvn" /usr/local/bin/mvn 2>/dev/null || true
  fi
  MVN="$MVN_BIN"
fi

echo "Using Java:"
java -version
echo "Using Maven at: $MVN"
"$MVN" -version

"$MVN" -q -B -DskipTests=false package
