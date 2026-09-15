#!/usr/bin/env python3
"""Synthesize the Helix ~3 min narration with a conversational neural voice."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import edge_tts

VOICE = "en-US-AndrewMultilingualNeural"
RATE = "-4%"
PITCH = "+0Hz"
OUT = Path("/tmp/ofx-voice")

BEATS = [
    {
        "id": "problem",
        "text": (
            "The problem is still the same, every close. A group unit like Revenue Accounting "
            "cannot get a clean answer to a simple question. Is it safe to run this process yet. "
            "Can we execute FOBO analysis. Can we produce the report. "
            "Today that answer lives across Motif, CATS, MBR, Helix, SAP. "
            "Each has its own screen, and its own language for done. So people chase. "
            "They open ten tools. They wait on a chat. Closes run late. SLAs slip. "
            "And when audit asks who knew, nobody holds the whole picture."
        ),
    },
    {
        "id": "help",
        "text": (
            "An outcome is that question, written down. We don't replace Motif or Helix. "
            "We listen to the facts they already emit. Master book ready. Break cleared. Analysis complete. "
            "Then we fold those facts into one row the user can actually use. Ready, or blocked, and why. "
            "If it's blocked, we name the key. That's how outcomes help. One answer, instead of a hunt."
        ),
    },
    {
        "id": "onboard",
        "text": (
            "You don't ship a new application for month-end close. "
            "You write the question, the feeds it waits on, the SLA, and what should happen when everything is in. "
            "Save it, and it's live."
        ),
    },
    {
        "id": "config",
        "text": (
            "Here's the contract. FOBO investigation. Three hundred Motif books. "
            "When they're in, the hub calls Helix. Helix reports back with a run id. "
            "Nobody clicks Helix on Home."
        ),
    },
    {
        "id": "drive",
        "text": (
            "Drive is the only place we inject the day. Reset, then FOBO Helix. "
            "The board and the reports stay the operating view."
        ),
    },
    {
        "id": "reports",
        "text": (
            "Watch the meter. This isn't polling Helix. The fold is counting books. "
            "At three hundred, ready. Then Helix runs."
        ),
    },
    {
        "id": "done",
        "text": (
            "Generated. Three hundred of three hundred. That's the answer on this close. "
            "The user doesn't open Motif to find it."
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
