#!/usr/bin/env python3
"""Validate docs/design/specification.md against the LLM coding spec rules."""
from __future__ import annotations

import re
import sys
from collections import defaultdict
from pathlib import Path

SPEC = Path(__file__).resolve().parents[1] / "docs/design/specification.md"
BANNED = re.compile(r"\b(should|could|improve|optimize|fast|simple|TBD)\b", re.I)
SUBSYSTEMS = ("INGEST", "FOLD", "ENGINE", "ACTION", "CONSOLE", "REPORTS", "GOVERN", "OPERATE")
REQUIRED_H2 = [
    "1. Document control",
    "2. Purpose",
    "3. Scope",
    "4. Definitions",
    "5. References",
    "6. Actors",
    "7. Constraints",
    "8. Assumptions",
    "9. System context",
    "10. Subsystem catalog",
    "11. Functional requirements",
    "12. Acceptance criteria",
    "13. Traceability",
    "14. Data contracts",
    "15. Interfaces",
    "16. Fail-closed behaviour and errors",
    "17. Security and entitlement",
    "18. Observability",
    "19. User interface rules",
    "20. Quality attributes",
    "21. Test strategy",
    "22. Implementer contract",
    "23. Change control",
    "24. Review checklist",
]


def main() -> int:
    text = SPEC.read_text(encoding="utf-8")
    errors: list[str] = []

    if not text.strip():
        errors.append("specification is empty")
        print("\n".join(errors))
        return 1

    headings = [(m.group(1), m.group(2).strip()) for m in re.finditer(r"^(#{1,6})\s+(.+)$", text, re.M)]
    if not headings or headings[0][0] != "#":
        errors.append("document must start with one H1")
    h1s = [t for lvl, t in headings if lvl == "#"]
    if len(h1s) != 1:
        errors.append(f"expected exactly one H1, found {len(h1s)}")

    prev = 0
    for lvl, title in headings:
        depth = len(lvl)
        if prev and depth > prev + 1:
            errors.append(f"heading jump H{prev} to H{depth} at {title}")
        prev = depth

    h2_titles = [t for lvl, t in headings if lvl == "##"]
    for required in REQUIRED_H2:
        if not any(t.startswith(required) or required in t for t in h2_titles):
            errors.append(f"missing required section: {required}")

    # No empty sections: an H2/H3 must have body text before the next same-or-higher heading.
    lines = text.splitlines()
    idx_heads = [(i, len(m.group(1)), m.group(2).strip()) for i, line in enumerate(lines)
                 if (m := re.match(r"^(#{1,6})\s+(.+)$", line))]
    for n, (i, depth, title) in enumerate(idx_heads):
        end = idx_heads[n + 1][0] if n + 1 < len(idx_heads) else len(lines)
        body = [ln.strip() for ln in lines[i + 1:end] if ln.strip() and not ln.strip().startswith("#")]
        if depth <= 3 and not body:
            errors.append(f"empty section: {title}")

    reqs = set(re.findall(r"REQ-[A-Z]+-\d{3}", text))
    acs = set(re.findall(r"AC-[A-Z]+-\d{2}", text))
    if not reqs:
        errors.append("no REQ-IDs found")
    for sys_name in SUBSYSTEMS:
        sys_reqs = sorted(r for r in reqs if r.startswith(f"REQ-{sys_name}-"))
        sys_acs = sorted(a for a in acs if a.startswith(f"AC-{sys_name}-"))
        if len(sys_acs) != 23:
            errors.append(f"{sys_name} has {len(sys_acs)} ACs, expected 23")
        if not sys_reqs:
            errors.append(f"{sys_name} has no REQ-IDs")

    # Each AC block must contain Given / When / Then and a REQ map.
    ac_blocks = re.split(r"(?=^#### AC-[A-Z]+-\d{2})", text, flags=re.M)
    mapped_req: dict[str, set[str]] = defaultdict(set)
    seen_ac: set[str] = set()
    for block in ac_blocks:
        m = re.match(r"#### (AC-[A-Z]+-\d{2})", block)
        if not m:
            continue
        ac = m.group(1)
        seen_ac.add(ac)
        if not re.search(r"^\s*-\s*Given\b", block, re.M):
            errors.append(f"{ac} missing Given")
        if not re.search(r"^\s*-\s*When\b", block, re.M):
            errors.append(f"{ac} missing When")
        if not re.search(r"^\s*-\s*Then\b", block, re.M):
            errors.append(f"{ac} missing Then")
        refs = re.findall(r"REQ-[A-Z]+-\d{3}", block)
        if not refs:
            errors.append(f"{ac} is not mapped to a REQ-ID")
        for r in refs:
            mapped_req[r].add(ac)

    unmapped = sorted(r for r in reqs if r not in mapped_req and not r.startswith("REQ-NFR-") and not r.startswith("REQ-DOC-"))
    # All functional REQ-* for subsystems must be mapped
    for r in sorted(reqs):
        prefix = r.split("-")[1]
        if prefix in SUBSYSTEMS and r not in mapped_req:
            errors.append(f"{r} has no mapped AC")

    for m in BANNED.finditer(text):
        line_no = text[: m.start()].count("\n") + 1
        errors.append(f"banned word '{m.group(0)}' on line {line_no}")

    if errors:
        print(f"FAIL {len(errors)} checks")
        for e in errors:
            print(f" - {e}")
        return 1
    print(f"PASS reqs={len(reqs)} acs={len(acs)} sections={len(h2_titles)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
