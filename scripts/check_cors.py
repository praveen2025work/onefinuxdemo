#!/usr/bin/env python3
"""Fail the build if CORS allows every origin.

The console is same-origin behind Vite / IIS / nginx. Hub and simulator may
echo an Origin the proxy forwards, but only exact URLs: never *, localhost:*,
or 127.0.0.1:*.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN = (
    ROOT / "onefinux-hub" / "src" / "main",
    ROOT / "source-simulator" / "src" / "main",
    ROOT / "frontend" / "web" / "src",
    ROOT / "frontend" / "web" / "nginx.conf",
    ROOT / "scripts",
)
SKIP_PARTS = {"target", "node_modules", "dist", "data", ".git"}
SKIP_NAMES = {"check_cors.py"}
WILDCARD = re.compile(
    r"localhost:\*|127\.0\.0\.1:\*|allowedOriginPatterns|"
    r"Access-Control-Allow-Origin\s*:\s*\*|setAllowedOrigins\([^)]*\"\*\"",
    re.I,
)
EXTS = {".java", ".yml", ".yaml", ".xml", ".conf", ".js", ".cmd", ".ps1", ".sh", ".md"}


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    raise SystemExit(1)


def main() -> int:
    hits: list[str] = []
    for root in SCAN:
        paths = [root] if root.is_file() else root.rglob("*")
        for path in paths:
            if not path.is_file() or path.suffix.lower() not in EXTS:
                continue
            if path.name in SKIP_NAMES:
                continue
            if any(part in SKIP_PARTS for part in path.parts):
                continue
            text = path.read_text(encoding="utf-8")
            if WILDCARD.search(text):
                hits.append(str(path.relative_to(ROOT)))
    if hits:
        fail("wildcard CORS origin in: " + ", ".join(hits))

    hub = (ROOT / "onefinux-hub" / "src" / "main" / "resources" / "application.yml").read_text(
        encoding="utf-8"
    )
    if "http://localhost:7091" not in hub or "http://localhost:8080" not in hub:
        fail("onefinux-hub application.yml must list exact console origins 7091 and 8080")
    if "localhost:*" in hub:
        fail("onefinux-hub application.yml still allows localhost:*")

    sim = (ROOT / "source-simulator" / "src" / "main" / "resources" / "application.yml").read_text(
        encoding="utf-8"
    )
    if "http://localhost:7091" not in sim:
        fail("source-simulator application.yml must list exact console origin 7091")

    if (ROOT / "onefinux-hub" / "src" / "main" / "java" / "com" / "onefinux" / "hub" / "config" / "WebCorsConfig.java").exists():
        fail("WebCorsConfig.java must stay deleted; SecurityConfig owns CORS")

    print("OK    CORS origins are an exact allowlist (no * / localhost:*)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
