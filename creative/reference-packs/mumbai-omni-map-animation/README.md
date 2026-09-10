# Mumbai Omni map-animation reference pack

This folder contains the first complete reference set for generating the Mumbai city-transition video with Gemini Omni in Google Flow.

## Start here

Upload the five files in `04-ready-to-upload` in numeric order, then paste `03-gemini-prompts/01-mumbai-generation-prompt.txt` into Gemini Omni.

1. `01-india-start-frame-16x9.png` — exact opening geography and visual framing.
2. `02-mumbai-geography-reference-16x9.png` — exact Mumbai/Mumbai Suburban target geometry.
3. `03-apshabd-brand-reference.jpg` — owned brand palette, wordmark and overall identity.
4. `04-apshabd-mumbai-reference.jpg` — owned Mumbai typography and campaign treatment.
5. `05-reel-style-reference-INTERNAL-ONLY.jpg` — motion/style reference only; do not copy or ship its text, layout or pixels.

## Recommended Omni task

Use **reference-to-video** or **image-to-video**, landscape `16:9`, and ask for a single continuous 4–5 second shot. Gemini Omni currently does not support true first-frame/last-frame interpolation, so the Mumbai image is a geographic target reference rather than a guaranteed final frame.

Generate the Mumbai master first. Iterate with the short prompts in `03-gemini-prompts/02-omni-edit-prompts.txt`, changing one thing per turn and ending each request with “Keep everything else the same.”

## Rights and attribution

- APSHABD brand and campaign images are existing project-owned assets.
- India ADM0 geometry is CC0 through geoBoundaries.
- India ADM2/Mumbai district geometry is ODbL 1.0 through geoBoundaries.
- The BBBike archive contains OpenStreetMap data under ODbL and requires OpenStreetMap attribution when used in a published result.
- The Instagram thumbnail is an internal reference to a third-party work by G Visualz. It is not cleared as a production asset.

See `docs/SOURCES.md` for exact URLs and attribution text.

