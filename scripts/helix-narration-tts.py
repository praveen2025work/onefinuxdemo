#!/usr/bin/env python3
"""Synthesize the Helix ~3 min narration with a conversational neural voice."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

# Multilingual Andrew keeps the male/warm CIO-MD tone without the flat
# "read this slide" cadence of a slowed standard Neural voice.
VOICE = "en-US-AndrewMultilingualNeural"
RATE = "-4%"
PITCH = "+0Hz"
OUT = Path("/tmp/ofx-voice")

BEATS = [
    {
        "id": "home",
        "text": (
            "This is the close for Revenue Accounting. Group unit sits in the header. "
            "The date is today. We're not asking whether Motif is finished. "
            "We're asking a simpler question: can we actually run FOBO analysis. "
            "One answer. Ready, or blocked, and why."
        ),
    },
    {
        "id": "onboard",
        "text": (
            "A new outcome is just data. The question it answers, the feeds it waits on, "
            "the SLA, and what should happen when everything is in. "
            "You don't ship a new application for month-end close. "
            "You save this, and it's live."
        ),
    },
    {
        "id": "config",
        "text": (
            "Configuration is where the owner reads the contract. FOBO investigation. "
            "Three hundred Motif books. When they're in, the hub calls Helix. "
            "Helix reports back with a run id. Nobody clicks Helix on Home."
        ),
    },
    {
        "id": "drive",
        "text": (
            "Drive is the only place we inject the day. Reset, so we start clean. "
            "Then FOBO Helix. The board and the reports stay the operating view. "
            "They only show the fold."
        ),
    },
    {
        "id": "reports",
        "text": (
            "Here's Reports. Motif is publishing master books. Watch the meter. "
            "This isn't polling Helix. Helix hasn't been called yet. "
            "The fold is just counting distinct books. "
            "When we reach three hundred, the row goes ready. "
            "Only then does the hub ask Helix to run. "
            "Helix says accepted, works for a few seconds, and publishes a completion with that run id. "
            "Generated. Three hundred of three hundred. That's the answer on this close. "
            "The user doesn't open Motif to find it."
        ),
    },
    {
        "id": "tape",
        "text": (
            "And the tape. Master book ready, then Helix analysis complete. Same facts. "
            "That's how you prove what happened, and how a user actually sees the result."
        ),
    },
]


async def synth(beat: dict) -> None:
    path = OUT / f"{beat['id']}.mp3"
    comm = edge_tts.Communicate(beat["text"], VOICE, rate=RATE, pitch=PITCH)
    await comm.save(str(path))
    beat["file"] = str(path)


async def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    await asyncio.gather(*[synth(b) for b in BEATS])
    manifest = []
    for b in BEATS:
        manifest.append({"id": b["id"], "file": b["file"], "text": b["text"]})
    (OUT / "beats.json").write_text(json.dumps(manifest, indent=2))
    print("wrote", OUT / "beats.json")


if __name__ == "__main__":
    asyncio.run(main())
