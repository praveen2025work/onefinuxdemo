#!/usr/bin/env python3
"""Build the architecture-group Q&A deck (HTML + PPTX) from one slide list."""
from __future__ import annotations

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT_HTML = ROOT / "docs/design/arch-qa-deck.html"
OUT_PPTX = ROOT / "docs/design/arch-qa-deck.pptx"

NAVY = RGBColor(0x09, 0x0D, 0x1C)
SURFACE = RGBColor(0x16, 0x1D, 0x33)
INK = RGBColor(0xE6, 0xE8, 0xEE)
MUTED = RGBColor(0xC7, 0xCA, 0xD6)
ACCENT = RGBColor(0x81, 0x8C, 0xF8)
OK = RGBColor(0x34, 0xD3, 0x99)
WARN = RGBColor(0xFB, 0xBF, 0x24)
FAIL = RGBColor(0xF8, 0x71, 0x71)
STROKE = RGBColor(0x23, 0x2B, 0x48)
CHIP = RGBColor(0x12, 0x18, 0x2C)

TONE_RGB = {
    "": (INK, STROKE),
    "ok": (OK, OK),
    "warn": (WARN, WARN),
    "fail": (FAIL, FAIL),
    "accent": (ACCENT, ACCENT),
    "mute": (MUTED, STROKE),
}

# Each slide: kicker, title, explain (spoken extra), flow diagram, then points/pairs/table.
# flow.kind = row | split
SLIDES = [
    {
        "kicker": "Architecture group  ·  CEO / CIO room",
        "title": "One Finance UX",
        "explain": "A thin on-prem outcome layer. It subscribes to facts the bank already produces and answers one question per close: Ready, Blocked, or Delayed — and why.",
        "flow": {
            "kind": "row",
            "caption": "Subscribe. Fold. Show one light. Do not replace Motif or Helix.",
            "nodes": [
                ("Motif · CATS · Helix", "mute"),
                "→",
                ("Facts", "accent"),
                "→",
                ("Hub fold", "ok"),
                "→",
                ("Ready / Blocked", "ok"),
                "→",
                ("One board", "accent"),
            ],
        },
        "points": [
            "Kafka, SNS, Redis, Airflow, Lambda move or schedule work. They are not this product.",
            "Phase 1 runs as-is: HTTP ingest, H2, three processes. No new cloud bill or broker licence.",
        ],
    },
    {
        "kicker": "The ask",
        "title": "Endorse the fold. Reuse the estate.",
        "explain": "The room is asked to name one system of decision — not to buy a stack. The bus, books, and rec the bank already paid for stay where they are.",
        "flow": {
            "kind": "row",
            "caption": "Four decisions to minute. First production outcome is FOBO.",
            "nodes": [
                ("Endorse the fold", "ok"),
                "→",
                ("Reuse Kafka / MQ", "accent"),
                "→",
                ("FOBO first", "accent"),
                "→",
                ("Next outcome = data", "ok"),
            ],
        },
        "points": [
            "Build the hub + entitled console in-house. It is the only Ready / Blocked system of decision.",
            "Reuse Kafka, Solace, or IBM MQ if they exist. Do not buy AWS to get a close.",
        ],
    },
    {
        "kicker": "The problem",
        "title": "The answer is scattered.",
        "explain": "“Is it safe to run this process yet?” lives in five screens and five status words. People chase. Closes run late. Audit asks who knew — nobody holds the picture.",
        "flow": {
            "kind": "split",
            "left": {
                "title": "Today — five answers",
                "tone": "warn",
                "nodes": ["Motif: MB014", "CATS: posted", "Helix: ran", "SAP: booked", "Nobody folds them"],
            },
            "right": {
                "title": "Needed — one stitch",
                "tone": "ok",
                "nodes": ["This COB · this region", "Named blocker", "One Ready / Blocked", "One human signs"],
            },
        },
        "points": [
            "Without this layer every team writes a different Ready / Blocked — spreadsheet, DAG, or dashboard.",
        ],
    },
    {
        "kicker": "What this is",
        "title": "Build the decision. Reuse the pipes.",
        "explain": "The product is the fold and the entitled board. Books grids, rec screens, brokers, and warehouses stay the systems of record.",
        "flow": {
            "kind": "row",
            "caption": "One path. Command once. Fail closed if the row is not entitled.",
            "nodes": [
                ("Ingest fact", "mute"),
                "→",
                ("Distinct-key fold", "ok"),
                "→",
                ("Command once", "accent"),
                "→",
                ("404 if not entitled", "warn"),
                "→",
                ("Audit + board", "ok"),
            ],
        },
        "pairs": [
            ("We reuse", "Motif, Helix, CATS, CEES, Kafka / MQ already paid, Oracle, Airflow after READY."),
            ("We never", "Rebuild books grids. Kafka in the browser. if (FOBO). LLM on the fold."),
        ],
    },
    {
        "kicker": "Category error",
        "title": "They move bytes. We decide Ready.",
        "explain": "A topic offset, a queue receipt, or a cache key proves produce / consume. It does not name R-2031 BLOCKED on MB014, ignore a stale run, or 404 an unentitled row.",
        "flow": {
            "kind": "split",
            "left": {
                "title": "Transport & glue",
                "tone": "warn",
                "nodes": ["Kafka / IBM MQ / AMQ", "SNS · SQS · EventBridge", "Lambda / Functions", "Redis cache"],
            },
            "right": {
                "title": "This fold",
                "tone": "ok",
                "nodes": ["Distinct source keys", "Named blocker", "runId once", "CEES 404 · audit"],
            },
        },
        "table": [
            ("Tool they name", "Good at", "Not a close"),
            ("Kafka / IBM MQ / AMQ", "Durable log, fan-out", "An offset is not BLOCKED on MB014"),
            ("SNS + SQS / Service Bus", "Queues and pub-sub", "A receipt is not Ready"),
            ("Lambda / Functions", "Glue and burst compute", "Re-implements the hub, off-prem"),
            ("Redis", "Cache", "Second truth if it owns Ready"),
            ("Airflow / Control-M", "Batch after READY", "Polling Motif recreates the late close"),
        ],
    },
    {
        "kicker": "Q  ·  Kafka / IBM MQ / ActiveMQ",
        "title": "Use the bus. Do not confuse it with the fold.",
        "explain": "A message on motif.book.lifecycle proves the producer wrote and the consumer read. FOBO still needs distinct books, a named blocker, and one Helix POST with a run id.",
        "flow": {
            "kind": "row",
            "caption": "Keep the broker. Adapter is thin. Browser never touches the bus.",
            "nodes": [
                ("Motif", "mute"),
                "→",
                ("Kafka / MQ topic", "accent"),
                "→",
                ("Thin adapter", "accent"),
                "→",
                ("POST /api/events", "ok"),
                "→",
                ("Fold → Helix once", "ok"),
            ],
        },
        "points": [
            "Kafka can store 300 MASTERBOOK_READY. The hub counts distinct keys, then POSTs Helix once.",
            "IBM MQ and ActiveMQ are the same category — a good adapter behind the same API. REST + SSE only in the browser.",
        ],
    },
    {
        "kicker": "Q  ·  AWS SNS, SQS, Lambda",
        "title": "Cloud messaging is not an outcome layer.",
        "explain": "SNS, SQS, EventBridge, Event Grid, and Service Bus have the same gap as Kafka: they move facts. Lambda or Step Functions rewrite this hub as billed invocations at COB burst — and the evidence leaves the bank.",
        "flow": {
            "kind": "split",
            "left": {
                "title": "AWS / Azure glue",
                "tone": "fail",
                "nodes": ["SNS / SQS / EventBridge", "Lambda at COB burst", "Close keys leave the DC", "Second IAM + bill"],
            },
            "right": {
                "title": "On-prem hub",
                "tone": "ok",
                "nodes": ["Same fold as the POC", "runId + sign-off stay", "Reuse paid bus if any", "No new cloud control plane"],
            },
        },
        "points": [
            "Do not buy a cloud account to get Ready / Blocked. If a bus exists, adapt it; if not, HTTP is enough for phase 1.",
        ],
    },
    {
        "kicker": "Q  ·  Redis",
        "title": "We do not use Redis. We do not need it.",
        "explain": "The fold is event-sourced. Replay the store and Ready / Blocked comes back. Putting that answer in Redis creates a second truth the moment a node fails over.",
        "flow": {
            "kind": "split",
            "left": {
                "title": "System of decision",
                "tone": "ok",
                "nodes": ["Event store (H2 → Oracle)", "Rebuild the fold", "Ready lives here"],
            },
            "right": {
                "title": "Optional later only",
                "tone": "warn",
                "nodes": ["Redis read-scale", "Never owns Ready", "Skip in phase 1"],
            },
        },
        "points": [
            "Phase 1: no cache licence. H2 now, Oracle later — already on the estate.",
        ],
    },
    {
        "kicker": "Q  ·  Airflow / Control-M",
        "title": "Batch after READY. Never instead of READY.",
        "explain": "A scheduler is good at warehouse loads and file drops after the light is green. If it polls Motif to decide Helix, you have rebuilt the late close inside a DAG.",
        "flow": {
            "kind": "row",
            "caption": "Green light first. Batch second. Never Motif-poll → Helix.",
            "nodes": [
                ("Facts", "mute"),
                "→",
                ("Fold READY", "ok"),
                "→",
                ("Command Helix", "accent"),
                "→",
                ("GENERATED", "ok"),
                "→",
                ("Then Airflow", "accent"),
            ],
        },
        "table": [
            ("If", "Airflow alone", "This fold"),
            ("Same book twice", "Easy to double-count", "Distinct sourceKey"),
            ("Book 147 fails", "Generic job error", "Named blocker; RTB replay"),
            ("Old Helix run", "Can land on today", "Stale runId ignored"),
            ("Motif 20s late", "Next poke, often minutes", "Event updates now"),
            ("Next outcome", "New DAG", "POST /definitions — data"),
        ],
    },
    {
        "kicker": "Q  ·  Zero-code phase 1",
        "title": "There is no zero-code substitute.",
        "explain": "ServiceNow, Power Automate, and n8n can land a ticket. A vendor control-tower RFP can copy screens into a lake. Neither folds distinct keys, ignores a stale run id, nor 404s an unentitled row.",
        "flow": {
            "kind": "split",
            "left": {
                "title": "Ticket / RPA / RFP",
                "tone": "warn",
                "nodes": ["Open a chase", "Copy Motif + Helix", "New product = new flow", "No CEES 404"],
            },
            "right": {
                "title": "Working POC",
                "tone": "ok",
                "nodes": ["Distinct-key fold", "Stale runId ignored", "Fail-closed entitle", "REV-ACC is a row"],
            },
        },
        "points": [
            "Zero new code means N shadow folds — spreadsheets, DAGs, dashboards — not a saving.",
        ],
    },
    {
        "kicker": "Q  ·  Use it as-is",
        "title": "Yes. That is the cheapest path that works.",
        "explain": "Phase 1 is the app you can run today: hub on :7070, console on :5173, simulator on :7081. Origins POST JSON. No Kafka, no Redis, no AWS account.",
        "flow": {
            "kind": "row",
            "caption": "Three processes. Same JSON Schema in production. Bus is optional later.",
            "nodes": [
                ("Origin / simulator", "mute"),
                "→",
                ("POST /api/events", "ok"),
                "→",
                ("Hub + H2", "ok"),
                "→",
                ("REST + SSE", "accent"),
                "→",
                ("Board", "ok"),
            ],
        },
        "points": [
            "Kafka, Redis, and Airflow can sit behind that API later. They do not replace the product.",
            "You save a cloud account, a new broker, and a cache you would then have to distrust.",
        ],
    },
    {
        "kicker": "Later mix — optional",
        "title": "If the bank already owns a bus, plug it in.",
        "explain": "The fold does not change when Motif writes a topic instead of HTTP. Production is a thin adapter plus a real Helix URL. Completion is another fact with the same run id.",
        "flow": {
            "kind": "row",
            "caption": "Same contract. Same fold. Airflow may load a warehouse after GENERATED — not decide Helix.",
            "nodes": [
                ("Motif", "mute"),
                "→",
                ("Existing Kafka", "accent"),
                "→",
                ("Adapter", "accent"),
                "→",
                ("Same /api/events", "ok"),
                "→",
                ("Same fold", "ok"),
                "→",
                ("Real Helix", "ok"),
            ],
        },
        "points": [
            "Do not introduce a bus to justify the product. Introduce it only if the estate already has one.",
        ],
    },
    {
        "kicker": "Why on-prem",
        "title": "The close stays in the bank.",
        "explain": "Ready / Blocked, run ids, and who signed are the control plane of the close. They belong in the DC next to Motif, CEES, and Oracle — not in a second cloud IAM plane.",
        "flow": {
            "kind": "split",
            "left": {
                "title": "On-prem, this app",
                "tone": "ok",
                "nodes": ["Facts + sign-off in the DC", "Reuse paid Kafka / MQ / Oracle", "Three JVM processes", "Next outcome is data"],
            },
            "right": {
                "title": "AWS / Azure / paid tower",
                "tone": "fail",
                "nodes": ["Egress + residency risk", "Burst bill at COB", "Second IAM plane", "Lake copy of Motif / Helix"],
            },
        },
        "points": [
            "A paid control-tower that copies books into a lake is the opposite of subscribe-don’t-replace.",
        ],
    },
    {
        "kicker": "Cost",
        "title": "Build once. Or pay forever in copies.",
        "explain": "The alternative is not zero code. It is FOBO in a spreadsheet, 15C3 in Control-M, PnL in a checklist, RTB in tickets — four answers that drift the first night SAP double-posts.",
        "flow": {
            "kind": "split",
            "left": {
                "title": "One shared fold",
                "tone": "ok",
                "nodes": ["One SAP fact", "Counted once", "FOBO + 15C3 + PnL", "One audit pack"],
            },
            "right": {
                "title": "N shadow folds",
                "tone": "fail",
                "nodes": ["Spreadsheet", "Control-M DAG", "Checklist", "Ticket queue"],
            },
        },
        "points": [
            "Value is controller minutes, SLA misses, rework, and audit packs — executive-brief.md §4.",
        ],
    },
    {
        "kicker": "Generic by design",
        "title": "The next use case is a row, not a release.",
        "explain": "An outcome is a question, feeds, an SLA, and an on-ready command. A kit is sources, destinations, embed, and verbs. FOBO is the first row. There is no if (FOBO) in Java.",
        "flow": {
            "kind": "row",
            "caption": "New command type = one controller bean. New kit verb = data.",
            "nodes": [
                ("Definition (data)", "accent"),
                "→",
                ("Same engine", "ok"),
                "→",
                ("FOBO", "ok"),
                ("15C3", "ok"),
                ("PnL", "ok"),
                ("Month-end", "ok"),
            ],
        },
        "points": [
            "Onboard the next group unit with POST /api/outcomes/definitions — not a new service.",
        ],
    },
    {
        "kicker": "Stay thin",
        "title": "What we refuse to build",
        "explain": "This layer dies when it becomes a second Motif, a second Helix, or a second bus. Thickness is the failure mode. Stay a subscriber.",
        "flow": {
            "kind": "row",
            "caption": "If a design needs these boxes, it is the wrong layer.",
            "nodes": [
                ("This hub", "ok"),
                "≠",
                ("Kafka broker", "fail"),
                ("Motif grid", "fail"),
                ("Helix clone", "fail"),
                ("CEES rewrite", "fail"),
                ("LLM on Ready", "fail"),
            ],
        },
        "points": [
            "No second mobile product. The entitled board already works on a phone between meetings.",
        ],
    },
    {
        "kicker": "Minute this",
        "title": "Six lines for the room",
        "explain": "These are the decisions the minutes should carry out. Everything else is implementation detail behind the same ingest contract.",
        "flow": {
            "kind": "row",
            "caption": "Subscribe → reuse → one fold → same ingest → FOBO first → stay thin.",
            "nodes": [
                ("Subscribe", "ok"),
                "→",
                ("Reuse the bus", "accent"),
                "→",
                ("One fold", "ok"),
                "→",
                ("Same ingest", "accent"),
                "→",
                ("FOBO first", "ok"),
                "→",
                ("Stay thin", "ok"),
            ],
        },
        "points": [
            "Airflow only after READY. CEES fail-closed. Non-goals stay binding so the layer stays thin.",
        ],
    },
    {
        "kicker": "Evidence, not slideware",
        "title": "Point at the working product.",
        "explain": "A counter-proposal is a replacement only if it can show the same four proofs in a running system — not in a vendor slide.",
        "flow": {
            "kind": "row",
            "caption": "Named blocker + run-id + 404 + onboard-as-data. Missing one is not this product.",
            "nodes": [
                ("Engine tests", "ok"),
                "→",
                ("Drive FOBO 300/300", "ok"),
                "→",
                ("Onboard as data", "ok"),
                "→",
                ("helix-walkthrough.mp4", "accent"),
            ],
        },
        "points": [
            "OutcomeEngineTest: distinct keys, FAILED blocks, stale runId ignored. Then Helix → Reports GENERATED.",
            "If they cannot demo those four proofs, they are proposing a bus, a DAG, or a dashboard.",
        ],
    },
]


def _set_run(run, text, size=20, bold=False, color=INK, name="Calibri"):
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = name


def _fill(shape, rgb):
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb
    shape.line.fill.background()


def _stroke_fill(shape, fill_rgb, line_rgb, width_pt=1.25):
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_rgb
    shape.line.color.rgb = line_rgb
    shape.line.width = Pt(width_pt)


def _chip_box(slide, l, t, w, h, text, tone=""):
    ink, line = TONE_RGB.get(tone, TONE_RGB[""])
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    _stroke_fill(shape, CHIP, line)
    tf = shape.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    try:
        shape.text_frame.paragraphs[0].alignment = PP_ALIGN.CENTER
    except Exception:
        pass
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    shape.text_frame.paragraphs[0].space_before = Pt(0)
    shape.text_frame.paragraphs[0].space_after = Pt(0)
    run = tf.paragraphs[0].add_run()
    _set_run(run, text, 11, True, ink)
    tf.paragraphs[0].alignment = PP_ALIGN.CENTER
    # vertical-ish: set anchor
    tf.auto_size = None
    try:
        from pptx.oxml.ns import qn

        body = shape._element.find(qn("p:txBody"))
        if body is not None:
            bodyPr = body.find(qn("a:bodyPr"))
            if bodyPr is not None:
                bodyPr.set("anchor", "ctr")
    except Exception:
        pass
    return shape


def _connector(slide, l, t, w, h, text):
    box = slide.shapes.add_textbox(l, t, w, h)
    tf = box.text_frame
    tf.word_wrap = False
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    color = FAIL if text == "≠" else ACCENT
    _set_run(run, text, 16, True, color)
    return box


def _panel(slide, l, t, w, h, title, tone, nodes):
    ink, line = TONE_RGB.get(tone, TONE_RGB["accent"])
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, l, t, w, h)
    _stroke_fill(card, SURFACE, line, 1.5)
    title_box = slide.shapes.add_textbox(l + Inches(0.12), t + Inches(0.06), w - Inches(0.24), Inches(0.28))
    tf = title_box.text_frame
    p = tf.paragraphs[0]
    run = p.add_run()
    _set_run(run, title.upper(), 10, True, ink)
    # nodes as a compact row inside the panel
    inner = [n if isinstance(n, str) else n[0] for n in nodes]
    gap = Inches(0.08)
    usable = w - Inches(0.2)
    n = max(1, len(inner))
    cw = (usable - gap * (n - 1)) / n
    y = t + Inches(0.38)
    x = l + Inches(0.1)
    ch = h - Inches(0.48)
    for label in inner:
        _chip_box(slide, x, y, cw, ch, label, tone)
        x += cw + gap


def _draw_flow(slide, flow, left, top, width, height):
    cap_h = Inches(0.26) if flow.get("caption") else Inches(0)
    if flow.get("caption"):
        box = slide.shapes.add_textbox(left, top, width, cap_h)
        tf = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        run = p.add_run()
        _set_run(run, flow["caption"], 12, False, MUTED)

    band_t = top + cap_h
    band_h = height - cap_h
    kind = flow.get("kind", "row")
    if kind == "split":
        mid = Inches(0.42)
        col_w = (width - mid) / 2
        _panel(slide, left, band_t, col_w, band_h, flow["left"]["title"], flow["left"].get("tone", ""), flow["left"]["nodes"])
        vs = slide.shapes.add_textbox(left + col_w, band_t + band_h / 3, mid, Inches(0.4))
        tf = vs.text_frame
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        _set_run(run, "≠", 20, True, FAIL)
        _panel(
            slide,
            left + col_w + mid,
            band_t,
            col_w,
            band_h,
            flow["right"]["title"],
            flow["right"].get("tone", ""),
            flow["right"]["nodes"],
        )
        return

    items = flow.get("nodes") or []
    # measure connectors vs chips
    gap = Inches(0.06)
    conn_w = Inches(0.28)
    chips = [it for it in items if not (isinstance(it, str) and it in {"→", "≠", "vs"})]
    n_chip = len(chips)
    n_conn = len(items) - n_chip
    usable = width - conn_w * n_conn - gap * max(0, len(items) - 1)
    chip_w = usable / max(1, n_chip)
    x = left
    y = band_t + Inches(0.06)
    h = band_h - Inches(0.1)
    for it in items:
        if isinstance(it, str) and it in {"→", "≠", "vs"}:
            _connector(slide, x, y, conn_w, h, "→" if it == "vs" else it)
            x += conn_w + gap
        else:
            label, tone = it if isinstance(it, tuple) else (it, "")
            _chip_box(slide, x, y, chip_w, h, label, tone)
            x += chip_w + gap


def build_pptx() -> None:
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]
    for i, s in enumerate(SLIDES, 1):
        slide = prs.slides.add_slide(blank)
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        _fill(bg, NAVY)
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.12), prs.slide_height)
        _fill(bar, ACCENT)

        k = slide.shapes.add_textbox(Inches(0.55), Inches(0.22), Inches(12.2), Inches(0.28))
        tf = k.text_frame
        p = tf.paragraphs[0]
        run = p.add_run()
        _set_run(run, s["kicker"].upper(), 11, True, ACCENT)

        t = slide.shapes.add_textbox(Inches(0.55), Inches(0.48), Inches(12.3), Inches(0.62))
        tf = t.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        run = p.add_run()
        _set_run(run, s["title"], 26, True, INK)

        y = Inches(1.12)
        if s.get("explain"):
            b = slide.shapes.add_textbox(Inches(0.55), y, Inches(12.3), Inches(0.72))
            tf = b.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            run = p.add_run()
            _set_run(run, s["explain"], 14, False, MUTED)
            y = Inches(1.86)

        if s.get("flow"):
            has_table = bool(s.get("table"))
            flow_h = Inches(1.15) if has_table else Inches(1.28)
            _draw_flow(slide, s["flow"], Inches(0.55), y, Inches(12.3), flow_h)
            y = y + flow_h + Inches(0.12)

        if s.get("points"):
            b = slide.shapes.add_textbox(Inches(0.55), y, Inches(12.3), Inches(7.02) - y)
            tf = b.text_frame
            tf.word_wrap = True
            for j, line in enumerate(s["points"]):
                p = tf.paragraphs[0] if j == 0 else tf.add_paragraph()
                p.level = 0
                p.space_after = Pt(8)
                run = p.add_run()
                _set_run(run, "▸  " + line, 16, False, INK)

        if s.get("pairs"):
            py = y
            pair_h = Inches(0.95)
            for label, body in s["pairs"]:
                card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), py, Inches(12.3), pair_h)
                _fill(card, SURFACE)
                tb = slide.shapes.add_textbox(Inches(0.75), py + Inches(0.08), Inches(11.9), pair_h - Inches(0.12))
                tf = tb.text_frame
                tf.word_wrap = True
                p = tf.paragraphs[0]
                run = p.add_run()
                _set_run(run, label, 11, True, OK)
                p = tf.add_paragraph()
                run = p.add_run()
                _set_run(run, body, 15, False, INK)
                py += pair_h + Inches(0.1)

        if s.get("table"):
            rows = s["table"]
            cols = len(rows[0])
            row_h = Inches(0.38) if len(rows) > 5 else Inches(0.42)
            table_shape = slide.shapes.add_table(len(rows), cols, Inches(0.55), y, Inches(12.3), row_h * len(rows))
            table = table_shape.table
            widths = [Inches(3.0), Inches(4.4), Inches(4.9)] if cols == 3 else [Inches(12.3 / cols)] * cols
            for ci, w in enumerate(widths[:cols]):
                table.columns[ci].width = w
            for ri, row in enumerate(rows):
                for ci, cell_text in enumerate(row):
                    cell = table.cell(ri, ci)
                    cell.text = ""
                    p = cell.text_frame.paragraphs[0]
                    run = p.add_run()
                    header = ri == 0
                    _set_run(run, cell_text, 11 if not header else 10, header, ACCENT if header else INK)
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = SURFACE if ri % 2 else RGBColor(0x12, 0x18, 0x2C)

        foot = slide.shapes.add_textbox(Inches(0.55), Inches(7.12), Inches(10), Inches(0.24))
        tf = foot.text_frame
        p = tf.paragraphs[0]
        run = p.add_run()
        _set_run(run, "One Finance UX  ·  confidential  ·  architecture Q&A", 10, False, MUTED)
        num = slide.shapes.add_textbox(Inches(11.7), Inches(7.12), Inches(1.2), Inches(0.24))
        tf = num.text_frame
        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.RIGHT
        run = p.add_run()
        _set_run(run, f"{i} / {len(SLIDES)}", 10, False, MUTED)

    prs.save(OUT_PPTX)
    print("wrote", OUT_PPTX)


def _esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _node_html(item) -> str:
    if isinstance(item, str) and item in {"→", "≠", "vs"}:
        cls = "neq" if item == "≠" else "arrow"
        glyph = "→" if item == "vs" else item
        return f'<span class="{cls}">{_esc(glyph)}</span>'
    label, tone = item if isinstance(item, tuple) else (item, "")
    return f'<span class="node {tone}">{_esc(label)}</span>'


def _flow_html(flow: dict) -> str:
    cap = f'<div class="dcap">{_esc(flow["caption"])}</div>' if flow.get("caption") else ""
    if flow.get("kind") == "split":
        def col(side: dict) -> str:
            tone = side.get("tone", "")
            chips = "".join(f'<span class="node {tone}">{_esc(n)}</span>' for n in side["nodes"])
            return (
                f'<div class="panel {tone}">'
                f'<div class="ptitle">{_esc(side["title"])}</div>'
                f'<div class="prow">{chips}</div>'
                f"</div>"
            )

        return (
            f'<div class="diagram split">{cap}'
            f'<div class="splitrow">{col(flow["left"])}<span class="neq">≠</span>{col(flow["right"])}</div>'
            f"</div>"
        )
    nodes = "".join(_node_html(n) for n in flow.get("nodes") or [])
    return f'<div class="diagram">{cap}<div class="drow">{nodes}</div></div>'


def build_html() -> None:
    parts = []
    for i, s in enumerate(SLIDES, 1):
        inner = [f'<p class="kicker">{_esc(s["kicker"])}</p>', f"<h1>{_esc(s['title'])}</h1>"]
        if s.get("explain"):
            inner.append(f'<p class="explain">{_esc(s["explain"])}</p>')
        if s.get("flow"):
            inner.append(_flow_html(s["flow"]))
        if s.get("points"):
            inner.append("<ul>" + "".join(f"<li>{_esc(p)}</li>" for p in s["points"]) + "</ul>")
        if s.get("pairs"):
            cards = "".join(
                f'<div class="card"><div class="lbl">{_esc(a)}</div><p>{_esc(b)}</p></div>' for a, b in s["pairs"]
            )
            inner.append(f'<div class="cards">{cards}</div>')
        if s.get("table"):
            rows = s["table"]
            head = "".join(f"<th>{_esc(c)}</th>" for c in rows[0])
            body = "".join("<tr>" + "".join(f"<td>{_esc(c)}</td>" for c in r) + "</tr>" for r in rows[1:])
            inner.append(f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>")
        inner.append(
            f'<div class="foot"><span>One Finance UX · architecture Q&A</span><span>{i} / {len(SLIDES)}</span></div>'
        )
        parts.append(f'<section class="slide" id="s{i}">{"".join(inner)}</section>')

    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>One Finance UX — architecture Q&A</title>
<style>
  :root {{
    --canvas:#090d1c; --surface:#161d33; --ink:#e6e8ee; --muted:#c7cad6;
    --accent:#818cf8; --ok:#34d399; --warn:#fbbf24; --fail:#f87171; --stroke:#232b48;
    --chip:#12182c;
    --sans: Inter, Segoe UI, system-ui, sans-serif;
  }}
  * {{ box-sizing:border-box; }}
  html,body {{ margin:0; height:100%; background:var(--canvas); color:var(--ink); font-family:var(--sans); }}
  .deck {{ height:100%; overflow:hidden; }}
  .slide {{
    display:none; height:100vh; padding:36px 56px 40px;
    flex-direction:column; border-left:6px solid var(--accent);
  }}
  .slide.on {{ display:flex; }}
  .kicker {{ color:var(--accent); letter-spacing:.14em; text-transform:uppercase; font-size:12px; font-weight:700; margin:0 0 6px; }}
  h1 {{ font-size:32px; line-height:1.15; margin:0 0 10px; font-weight:700; }}
  .explain {{ color:var(--muted); font-size:17px; line-height:1.4; margin:0 0 14px; max-width:58rem; }}
  ul {{ margin:6px 0 0; padding:0; list-style:none; }}
  li {{ font-size:18px; line-height:1.4; margin:0 0 10px; padding-left:26px; position:relative; max-width:58rem; }}
  li:before {{ content:"▸"; position:absolute; left:0; color:var(--accent); }}
  .cards {{ display:flex; flex-direction:column; gap:10px; margin-top:6px; }}
  .card {{ background:var(--surface); border:1px solid var(--stroke); border-radius:12px; padding:12px 16px; }}
  .card .lbl {{ color:var(--ok); font-size:12px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; margin-bottom:4px; }}
  .card p {{ margin:0; font-size:17px; line-height:1.4; }}
  table {{ border-collapse:collapse; width:100%; margin-top:8px; font-size:14px; }}
  th,td {{ text-align:left; padding:7px 10px; border-bottom:1px solid var(--stroke); vertical-align:top; }}
  th {{ color:var(--accent); font-size:11px; letter-spacing:.08em; text-transform:uppercase; }}
  .diagram {{
    background:var(--surface); border:1px solid var(--stroke); border-radius:14px;
    padding:10px 14px 12px; margin:0 0 12px;
  }}
  .dcap {{ color:var(--muted); font-size:13px; margin:0 0 8px; }}
  .drow, .prow, .splitrow {{ display:flex; align-items:stretch; gap:8px; flex-wrap:nowrap; }}
  .splitrow {{ align-items:stretch; }}
  .node {{
    flex:1; min-width:0; background:var(--chip); border:1px solid var(--stroke);
    border-radius:10px; padding:10px 8px; font-size:13px; font-weight:650;
    text-align:center; line-height:1.25; display:flex; align-items:center; justify-content:center;
  }}
  .node.ok {{ border-color:var(--ok); color:var(--ok); }}
  .node.warn {{ border-color:var(--warn); color:var(--warn); }}
  .node.fail {{ border-color:var(--fail); color:var(--fail); }}
  .node.accent {{ border-color:var(--accent); color:var(--accent); }}
  .node.mute {{ color:var(--muted); }}
  .arrow, .neq {{
    flex:0 0 28px; display:flex; align-items:center; justify-content:center;
    color:var(--accent); font-size:22px; font-weight:700;
  }}
  .neq {{ color:var(--fail); }}
  .panel {{
    flex:1; background:var(--chip); border:1.5px solid var(--stroke);
    border-radius:12px; padding:8px 10px 10px;
  }}
  .panel.ok {{ border-color:var(--ok); }}
  .panel.warn {{ border-color:var(--warn); }}
  .panel.fail {{ border-color:var(--fail); }}
  .ptitle {{
    font-size:11px; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
    margin:0 0 8px; color:var(--accent);
  }}
  .panel.ok .ptitle {{ color:var(--ok); }}
  .panel.warn .ptitle {{ color:var(--warn); }}
  .panel.fail .ptitle {{ color:var(--fail); }}
  .foot {{ margin-top:auto; display:flex; justify-content:space-between; color:var(--muted); font-size:12px; padding-top:12px; }}
  .hint {{ position:fixed; right:28px; bottom:22px; color:#7e85a3; font-size:12px; }}
  @media print {{
    .slide {{ display:flex; height:100vh; page-break-after:always; }}
    .hint {{ display:none; }}
  }}
</style>
</head>
<body>
<div class="deck">
{"".join(parts)}
</div>
<div class="hint">← →  or click  ·  F for fullscreen</div>
<script>
const slides=[...document.querySelectorAll('.slide')];
let i=0;
function show(n){{ i=(n+slides.length)%slides.length; slides.forEach((s,k)=>s.classList.toggle('on',k===i)); history.replaceState(null,'','#s'+(i+1)); }}
document.addEventListener('keydown',e=>{{
  if(['ArrowRight','PageDown',' ','Enter'].includes(e.key)) {{ e.preventDefault(); show(i+1); }}
  if(['ArrowLeft','PageUp','Backspace'].includes(e.key)) {{ e.preventDefault(); show(i-1); }}
  if(e.key==='Home') show(0);
  if(e.key==='End') show(slides.length-1);
  if(e.key==='f'||e.key==='F') document.documentElement.requestFullscreen?.();
}});
document.addEventListener('click',e=>{{ if(!e.target.closest('a')) show(i+1); }});
const start=parseInt((location.hash||'#s1').slice(2),10)-1;
show(Number.isFinite(start)&&start>=0?start:0);
</script>
</body>
</html>
"""
    OUT_HTML.write_text(html)
    print("wrote", OUT_HTML)


if __name__ == "__main__":
    build_html()
    build_pptx()
