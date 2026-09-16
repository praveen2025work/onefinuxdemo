#!/usr/bin/env python3
"""Fail the build if CORS allows every origin or every port.

Localhost stays an exact URL. Ethernet / WiFi IPv4 may use RFC1918 patterns
on the console ports (7091, 8080) only. Never *, never localhost:*.
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
# Allow RFC1918 host stars on 7091/8080. Ban allow-all and any-port localhost.
BANNED = re.compile(
    r"localhost:\*|127\.0\.0\.1:\*|"
    r"Access-Control-Allow-Origin\s*:\s*\*|"
    r"setAllowedOrigins\([^)]*\"\*\"|"
    r"allowedOriginPatterns\(\s*\"\*\"\s*\)",
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
            if BANNED.search(text):
                hits.append(str(path.relative_to(ROOT)))
    if hits:
        fail("wildcard CORS origin in: " + ", ".join(hits))

    hub = (ROOT / "onefinux-hub" / "src" / "main" / "resources" / "application.yml").read_text(
        encoding="utf-8"
    )
    if "http://localhost:7091" not in hub or "http://localhost:8080" not in hub:
        fail("onefinux-hub application.yml must list exact console origins 7091 and 8080")
    if "http://192.168.*:7091" not in hub:
        fail("onefinux-hub application.yml must allow RFC1918 IPv4 on port 7091")
    if "localhost:*" in hub:
        fail("onefinux-hub application.yml still allows localhost:*")

    sim = (ROOT / "source-simulator" / "src" / "main" / "resources" / "application.yml").read_text(
        encoding="utf-8"
    )
    if "http://localhost:7091" not in sim or "http://192.168.*:7091" not in sim:
        fail("source-simulator application.yml must list localhost and RFC1918 on 7091")

    vite = (ROOT / "frontend" / "web" / "vite.config.js").read_text(encoding="utf-8")
    if "0.0.0.0" not in vite and "host: true" not in vite:
        fail("vite.config.js must listen on 0.0.0.0 so Ethernet/WiFi IPv4 can load the UI")

    if (ROOT / "onefinux-hub" / "src" / "main" / "java" / "com" / "onefinux" / "hub" / "config" / "WebCorsConfig.java").exists():
        fail("WebCorsConfig.java must stay deleted; SecurityConfig owns CORS")

    print("OK    CORS is localhost + RFC1918 on 7091/8080 (no allow-all)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
