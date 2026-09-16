#!/usr/bin/env python3
"""Live notifications must appear outside the browser (OS/Action Center), not on the page."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / "frontend" / "web" / "src" / "components" / "Layout.jsx"
STORE = ROOT / "frontend" / "web" / "src" / "store.jsx"
NOTIFY = ROOT / "frontend" / "web" / "src" / "notifyDesktop.js"
SW = ROOT / "frontend" / "web" / "public" / "notify-sw.js"


def fail(msg: str) -> None:
    print(f"FAIL  {msg}")
    raise SystemExit(1)


def main() -> int:
    layout = LAYOUT.read_text(encoding="utf-8")
    store = STORE.read_text(encoding="utf-8")
    notify = NOTIFY.read_text(encoding="utf-8")
    sw = SW.read_text(encoding="utf-8")
    if "toast-stack" in layout or "ToastCard" in layout:
        fail("Layout.jsx must not draw notification cards on the page")
    if "Enable desktop alerts" not in layout:
        fail("Layout.jsx must offer Enable desktop alerts")
    if "pushMonitorNotification" not in store:
        fail("store.jsx must fan SSE notifications to the desktop channel")
    if "setToasts" in store:
        fail("store.jsx must not keep an in-page toast stack")
    if "showNotification" not in notify and "showNotification" not in sw:
        fail("desktop channel must call showNotification")
    if "notify-sw.js" not in notify:
        fail("notifyDesktop.js must register /notify-sw.js")
    if "showNotification" not in sw or "notificationclick" not in sw:
        fail("notify-sw.js must show and handle OS notifications")
    print("OK    notifications go outside the browser via the Notification API")
    return 0


if __name__ == "__main__":
    sys.exit(main())
