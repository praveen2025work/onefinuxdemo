#!/usr/bin/env python3
"""Live notifications must appear outside the browser as polished OS cards."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / "frontend" / "web" / "src" / "components" / "Layout.jsx"
STORE = ROOT / "frontend" / "web" / "src" / "store.jsx"
NOTIFY = ROOT / "frontend" / "web" / "src" / "notifyDesktop.js"
SW = ROOT / "frontend" / "web" / "public" / "notify-sw.js"
ICON = ROOT / "frontend" / "web" / "public" / "notify-icon.png"
BADGE = ROOT / "frontend" / "web" / "public" / "notify-badge.png"


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
    if "Desktop alerts" not in layout:
        fail("Layout.jsx must offer Desktop alerts")
    if "pushMonitorNotification" not in store:
        fail("store.jsx must fan SSE notifications to the desktop channel")
    if "setToasts" in store:
        fail("store.jsx must not keep an in-page toast stack")
    for token in ("notify-icon.png", "actions", "requireInteraction", "formatDesktopCard"):
        if token not in notify:
            fail(f"notifyDesktop.js must contain {token}")
    if "notify-sw.js" not in notify:
        fail("notifyDesktop.js must register /notify-sw.js")
    for token in ("showNotification", "notificationclick", "Open", "Dismiss", "notify-icon.png"):
        if token not in sw:
            fail(f"notify-sw.js must contain {token}")
    if not ICON.is_file() or ICON.stat().st_size < 200:
        fail("public/notify-icon.png is missing")
    if not BADGE.is_file():
        fail("public/notify-badge.png is missing")
    print("OK    polished desktop cards (icon, actions, outside the browser)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
