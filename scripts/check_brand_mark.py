#!/usr/bin/env python3
"""BrandMark must not share a document-global SVG paint id.

Two BrandMarks mount at once (rail + collapsed header). A fixed id such as
ofx-g means url(#ofx-g) can resolve to the rail copy. When the rail brand is
display:none, browsers drop that paint and only the white briefcase stroke
remains — invisible on the light header.

The mark is now the app icon as an <img> (light/dark file per theme), which has
no paint id at all. If it goes back to inline SVG with a gradient, the useId
rule applies again.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / "frontend" / "web" / "src" / "components" / "Icon.jsx"
FIXED_ID = re.compile(r"""id=["']ofx-g["']""")


def main() -> int:
    text = SRC.read_text(encoding="utf-8")
    start = text.find("export function BrandMark")
    if start < 0:
        print("FAIL  BrandMark is missing from Icon.jsx")
        return 1
    end = text.find("\nexport ", start + 1)
    fn = text[start:end if end > 0 else len(text)]
    if FIXED_ID.search(fn):
        print("FAIL  BrandMark uses a fixed SVG id ofx-g; two instances collide")
        return 1
    if "Gradient" not in fn and "url(#" not in fn:
        print("OK    BrandMark has no SVG paint id (image mark)")
        return 0
    if "useId" not in fn:
        print("FAIL  BrandMark must mint a unique gradient id per instance (useId)")
        return 1
    print("OK    BrandMark mints a unique SVG gradient id per instance")
    return 0


if __name__ == "__main__":
    sys.exit(main())
