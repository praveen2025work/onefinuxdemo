# Executive demo pack (MD / CIO)

Material for demonstrating One Finance UX to a Managing Director / CIO audience. Everything here is backed by the working system — not slideware.

| File | Use it for |
|---|---|
| [`executive-brief.md`](./executive-brief.md) | The narrative: problem, what they'll see, a value model (plug in your numbers), architecture-at-a-glance, roadmap, the ask, and a CIO FAQ. |
| [`demo-runsheet.md`](./demo-runsheet.md) | Facilitator script: a 5-min **MD business story** and a 10-min **CIO deep-dive**, with the exact click path, talking points, and fallbacks. |
| [`architecture.md`](./architecture.md) | The **diagram set** — proper Mermaid (renders on GitHub) exported to SVG/PNG: enterprise context, deployment (`frontend/web`), event sequence, data model, stitch kit states, and Outcome Engine stages. Source under [`diagrams/`](./diagrams); regenerate with [`diagrams/render.sh`](./diagrams/render.sh). |

Supporting assets already in the repo:

- Narrated end-to-end demo video (config → outcome → good flow → bad flow → RTB): [`../demo/onefinux_config_to_outcome_demo_narrated.mp4`](../demo/onefinux_config_to_outcome_demo_narrated.mp4).
- Architecture-group BRD (scope line, non-functionals, entitlement contract): [`../brd/architecture-group.md`](../brd/architecture-group.md).
- Onboarding runbook (add a group unit, bind sources, register a kit): [`../onboarding.md`](../onboarding.md).

## Still open (needs your input, not engineering)

- **Value quantification.** The brief ships a value *model*; the numbers are illustrative placeholders. Provide controller count, outcomes/COB, average manual minutes per outcome, and current SLA-miss rate and it becomes a credible before/after.
