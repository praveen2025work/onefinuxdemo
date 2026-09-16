#!/usr/bin/env python3
"""The live SSE notification must render as a bottom-right card with a dismiss X."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / "frontend" / "web" / "src" / "components" / "Layout.jsx"
CSS = ROOT / "frontend" / "web" / "src" / "styles.css"
STORE = ROOT / "frontend" / "web" / "src" / "store.jsx"


def fail(msg: str) -> None:
    print(f"FAIL  {msg}")
    raise SystemExit(1)


def main() -> int:
    layout = LAYOUT.read_text(encoding="utf-8")
    css = CSS.read_text(encoding="utf-8")
    store = STORE.read_text(encoding="utf-8")
    for token in ("toast-stack", "toast-card", "toast-x", "Dismiss"):
        if token not in layout:
            fail(f"Layout.jsx must contain {token}")
    if "right: 22px" not in css or "toast-stack" not in css:
        fail("styles.css must pin toast-stack to the bottom-right")
    if "dismissToast" not in store or "toasts" not in store:
        fail("store.jsx must keep a dismissible toast stack from SSE notifications")
    print("OK    SSE notifications render as bottom-right cards with X")
    return 0


if __name__ == "__main__":
    sys.exit(main())
