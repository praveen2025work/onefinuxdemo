# Helix silent UI walkthrough (long cut)

The **3-minute narrated** cut is [`helix-walkthrough.mp4`](helix-walkthrough.mp4). Use that in a room. Script: [`helix-narration.txt`](helix-narration.txt).

This file describes the **long silent** recording — every console control, captions only, no voice: [`helix-silent-walkthrough.mp4`](helix-silent-walkthrough.mp4).

Re-record the long silent cut (DISPLAY `:1`, headed Chrome, ffmpeg):

```bash
# hub 7070 + simulator 7081 + Vite 5173 already running
cd /tmp/ofx-pup   # puppeteer-core is installed here in the cloud agent image
cp $REPO/scripts/helix-silent-walkthrough.mjs .
bash $REPO/scripts/record-helix-silent-walkthrough.sh $REPO/docs/design/helix-silent-walkthrough.mp4
```

The 3-minute voiced cut: `scripts/record-helix-narrated-walkthrough.sh` (Edge neural `en-US-AndrewMultilingualNeural`).

Written companion: [`helix-walkthrough.md`](helix-walkthrough.md).
