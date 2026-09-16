#!/usr/bin/env python3
"""Prove the Windows IIS + NSSM host files stay complete.

This does not start IIS or NSSM (those are Windows-only). It fails the build
when the enablement files or the required rewrite / service contracts drift.
"""
from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WEB_CONFIG = ROOT / "frontend" / "web" / "public" / "web.config"
README = ROOT / "README.md"
START = ROOT / "docs" / "design" / "start.md"
RUN_CMD = ROOT / "scripts" / "run.cmd"
CONSOLE_CMD = ROOT / "scripts" / "console.cmd"
WINDOWS = ROOT / "scripts" / "windows"
REQUIRED_SCRIPTS = (
    "build-demo.cmd",
    "install-nssm.ps1",
    "uninstall-nssm.ps1",
    "install-iis-site.ps1",
    "uninstall-iis-site.ps1",
    "check-host.ps1",
)


def fail(message: str) -> None:
    print(f"FAIL  {message}")
    raise SystemExit(1)


def ok(message: str) -> None:
    print(f"OK    {message}")


def main() -> int:
    if not WEB_CONFIG.is_file():
        fail(f"missing {WEB_CONFIG.relative_to(ROOT)}")
    try:
        tree = ET.parse(WEB_CONFIG)
    except ET.ParseError as exc:
        fail(f"web.config is not well-formed XML: {exc}")
    text = WEB_CONFIG.read_text(encoding="utf-8")
    if "No Managed Code" not in text:
        fail("web.config must state No Managed Code for the IIS app pool")
    if "127.0.0.1:7070" not in text:
        fail("web.config must reverse-proxy /api to 127.0.0.1:7070")
    if "127.0.0.1:7081" not in text:
        fail("web.config must reverse-proxy /sim to 127.0.0.1:7081")
    if "index.html" not in text:
        fail("web.config must rewrite unknown paths to /index.html")
    if "urlCompression" not in text:
        fail("web.config must disable compression on /api for SSE")
    root = tree.getroot()
    if root.tag != "configuration":
        fail(f"web.config root is {root.tag}, expected configuration")
    if root.find("system.web") is not None:
        fail("web.config must not include system.web — that is ASP.NET; the app pool is No Managed Code")
    names = [rule.get("name", "") for rule in root.findall(".//rule")]
    if names[:2] != ["Proxy API to OneFinUxHub", "Proxy SIM to OneFinUxSimulator"]:
        fail(f"API and SIM proxy rules must come first, got {names}")
    if "SPA history fallback" not in names:
        fail("web.config must include the SPA history fallback rule")
    api = root.find(".//rule[@name='Proxy API to OneFinUxHub']/action")
    sim = root.find(".//rule[@name='Proxy SIM to OneFinUxSimulator']/action")
    spa = root.find(".//rule[@name='SPA history fallback']/action")
    if api is None or api.get("url") != "http://127.0.0.1:7070/api{R:1}":
        fail(f"API rewrite is {None if api is None else api.get('url')}")
    if sim is None or sim.get("url") != "http://127.0.0.1:7081/sim{R:1}":
        fail(f"SIM rewrite is {None if sim is None else sim.get('url')}")
    if spa is None or spa.get("url") != "/index.html":
        fail(f"SPA rewrite is {None if spa is None else spa.get('url')}")
    ok("frontend/web/public/web.config (SPA + ARR + SSE)")

    for name in REQUIRED_SCRIPTS:
        path = WINDOWS / name
        if not path.is_file():
            fail(f"missing {path.relative_to(ROOT)}")
        ok(str(path.relative_to(ROOT)))

    nssm = (WINDOWS / "install-nssm.ps1").read_text(encoding="utf-8")
    for token in (
        "OneFinUxHub",
        "OneFinUxSimulator",
        "AppDirectory",
        "onefinux-hub",
        "source-simulator",
        "#Requires -RunAsAdministrator",
    ):
        if token not in nssm:
            fail(f"install-nssm.ps1 must contain {token}")
    ok("install-nssm.ps1 hosts both Java jars as NSSM services")

    iis = (WINDOWS / "install-iis-site.ps1").read_text(encoding="utf-8")
    for token in (
        "managedRuntimeVersion",
        "No Managed Code",
        "Application Request Routing",
        "frontend\\web\\dist",
        "#Requires -RunAsAdministrator",
    ):
        if token not in iis:
            fail(f"install-iis-site.ps1 must contain {token}")
    ok("install-iis-site.ps1 creates a No Managed Code IIS site")

    readme = README.read_text(encoding="utf-8")
    for token in (
        "Windows local demo",
        "Windows hosted demo",
        "No Managed Code",
        "NSSM",
        r"scripts\windows\build-demo.cmd",
        r"scripts\windows\install-nssm.ps1",
        r"scripts\windows\install-iis-site.ps1",
    ):
        if token not in readme:
            fail(f"README.md must document {token}")
    if r"scripts\console.cmd" not in readme:
        fail(r"README.md must document scripts\console.cmd")
    if "7091" not in readme:
        fail("README.md must document the console on 7091")
    if "http://localhost:5173" in readme:
        fail("README.md must not send the local console to 5173")
    ok("README.md has numbered Windows local and hosted steps")

    start = START.read_text(encoding="utf-8")
    if "scripts\\windows\\build-demo.cmd" not in start and "Windows hosted demo" not in start:
        fail("docs/design/start.md must point at the Windows host path")
    if "7091" not in start:
        fail("docs/design/start.md must open the console on 7091")
    ok("docs/design/start.md points at the Windows path")

    if not RUN_CMD.is_file():
        fail("missing scripts/run.cmd")
    run = RUN_CMD.read_text(encoding="utf-8")
    if "\u2014" in run or "\u2013" in run:
        fail("run.cmd must use ASCII only; cmd.exe garbles em-dash")
    if "console.cmd" not in run:
        fail("run.cmd must start scripts\\console.cmd for the product UI")
    if "7091" not in run:
        fail("run.cmd must print the UI on 7091")
    if "http://localhost:5173" in run:
        fail("run.cmd must not send the UI to 5173")
    ok("scripts/run.cmd starts Java and opens the console on 7091")

    if not CONSOLE_CMD.is_file():
        fail("missing scripts/console.cmd")
    console = CONSOLE_CMD.read_text(encoding="utf-8")
    if "7091" not in console:
        fail("console.cmd must start the UI on 7091")
    if "npm run dev" not in console:
        fail("console.cmd must run npm run dev")
    if "http://localhost:5173" in console:
        fail("console.cmd must not use 5173")
    ok("scripts/console.cmd serves the product UI on 7091")

    vite = (ROOT / "frontend" / "web" / "vite.config.js").read_text(encoding="utf-8")
    if "port: 7091" not in vite:
        fail("vite.config.js must bind the console to 7091")
    if "strictPort: true" not in vite:
        fail("vite.config.js must set strictPort so a busy 7091 fails instead of hopping")
    if "port: 5173" in vite:
        fail("vite.config.js must not bind 5173")
    ok("frontend/web/vite.config.js listens on 7091")

    print("Windows IIS + NSSM host files are in place.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
