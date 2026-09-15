# Helix silent UI walkthrough

Silent (no voice) recording of every console control a user touches to:

1. Scope a **group unit** and COB
2. **Onboard** a business outcome
3. Read the **FOBO_HELIX** contract
4. **Drive** the Helix engine scenario
5. See the result on **Reports**, My outcomes, Board, and Monitoring

Video: [`helix-silent-walkthrough.mp4`](helix-silent-walkthrough.mp4) (no audio). Captions on screen replace a voiceover.

Re-record (DISPLAY `:1`, headed Chrome, ffmpeg):

```bash
# hub 7070 + simulator 7081 + Vite 5173 already running
cd /tmp/ofx-pup   # puppeteer-core is installed here in the cloud agent image
cp $REPO/scripts/helix-silent-walkthrough.mjs .
bash $REPO/scripts/record-helix-silent-walkthrough.sh $REPO/docs/design/helix-silent-walkthrough.mp4
```

Written companion: [`helix-walkthrough.md`](helix-walkthrough.md).

## Chapters in the recording

| # | What you see | Controls called out |
|---|---|---|
| 1 | Home + header | Group unit (REV-ACC), COB calendar → **today**, region = all, View = All screens, live pill, scope bar |
| 1b | Configuration | Group unit panel (id, name, regions, COB dates). No create wizard — units are registry data |
| 2 | Onboarding | Outcome id, name, question, owner, regions, SLA (window + cut-off), every feed column, Add feed, on-ready **Command an engine** (target `helix`, `HELIX_ANALYSIS_COMPLETE`), then Notify only, **Onboard outcome** |
| 2b | Configuration | Pick **FOBO investigation** (`FOBO_HELIX`): question, live state, HTTP_COMMAND → helix, Motif `MASTERBOOK_READY` × 300 |
| 3 | Product | Two Helix stories (Board rec vs Reports engine). Do not mix COBs |
| 3b | Drive | **Reset**, then **FOBO / Helix → Drive**. Home/Board/Reports stay view-only |
| 4 | Reports | Live fold NOT_STARTED → FEEDS (n/300) → READY → PROCESSING (~6s) → GENERATED. Flow, feed meter, result line, SLA clock |
| 4b | My outcomes / Board | Doer list vs CIO traffic lights. Engine Helix is Reports; stitch recs use COB 2026-09-12 |
| 4c | Monitoring | Tape: `MASTERBOOK_READY` then `HELIX_ANALYSIS_COMPLETE` |

Helix engine COB is **today** (`America/New_York`). FOBO stitch recs (R-1042 / R-2031) use **2026-09-12**. The recording stays on today so Reports shows the live Helix run.
