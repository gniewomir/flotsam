# Chrome Web Store assets

Generated listing screenshots and promotional tiles for Flotsam. Official image rules: [Supplying images](https://developer.chrome.com/docs/webstore/images) and [Best listing practices](https://developer.chrome.com/docs/webstore/best_listing).

## Color palette

All store-facing colors (listing composites, **hero slide** (01), “never auto-close” slide, promo gradients) are defined in **[`palette.json`](palette.json)**. Each swatch includes a short **usage** note. Scripts read this file via [`scripts/lib/store-palette.mjs`](../scripts/lib/store-palette.mjs) (`sharpListing`, `getNeverAutoCloseSlideHtml()`, and interpolated SVG for promos). **Change colors there**, then run `npm run store:all` to refresh `generated/`.

## Dimensions

| Asset                      | Size                            | Notes                                                                                                          |
| -------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Listing screenshots**    | **1280×800** or 640×400 (16:10) | Prefer 1280×800; square corners, **full bleed**, no outer padding in the file.                                 |
| **Screenshots count**      | **Max 5** per locale            | This repo generates **five** PNGs (01–04 and 06), matching the store limit.                                    |
| **Small promo**            | **440×280**                     | Required for listing prominence. Prefer **minimal text**; bold graphics; works on light gray store background. |
| **Marquee promo**          | **1400×560**                    | Optional; used for featured placement.                                                                         |
| **Extension package icon** | **128×128** PNG in the ZIP      | 96×96 artwork + transparent padding; see same doc.                                                             |

## Regenerate

From the repo root (01–02 are Sharp-only; Playwright uses the local unpacked extension only):

```bash
npm run store:screenshots
npm run store:promo
# or both:
npm run store:all
```

Outputs go to [`generated/`](generated/).

- **`npm run store:screenshots`** — Runs `npm run build`, then Playwright + Sharp to write five listing screenshots and [`generated/manifest.json`](generated/manifest.json).
- **`npm run store:promo`** — Runs `npm run build`, then Sharp-only promotional tiles (`promo-small-440x280.png`, `promo-marquee-1400x560.png`).

### Headless / CI

Extension loading is more reliable in **headed** mode locally. For automation, set:

```bash
HEADLESS=1 npm run store:screenshots
```

If Chromium fails to load the extension headlessly, run without `HEADLESS` on a machine with a display (or use Xvfb on Linux).

## What each listing image is

| File                          | Purpose                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-hero-stale-tabs.png`      | Composed hero: **Flotsam** title, two-line tagline, large anchored icon, `heroSlide` gradient ([`palette.json`](palette.json)).                                |
| `02-floating-vs-anchored.png` | Composed explainer: 1.3× title/subtitle/icons, vertically centered in each half ([`composeFloatingVsAnchored`](../../scripts/composite-store-screenshot.mjs)). |
| `03-auto-close-timeout.png`   | Real **Options** card (timeout), scaled and centered on **listing.canvas** margin ([`palette.json`](palette.json) `listing.cardFrame`).                        |
| `04-excluded-domains.png`     | Same treatment for excluded domains card.                                                                                                                      |
| `06-never-auto-closes.png`    | Composed **HTML** slide (header + list, same copy as About); palette gradient + black text.                                                                    |

## Implementation notes

- **Options cards (03 & 04):** Raw card screenshots are composited with [`fitCardScreenshotToStore`](../../scripts/composite-store-screenshot.mjs) — smaller card centered on the blueish `listing.canvas` color; tune **`listing.cardFrame`** in [`palette.json`](palette.json).
- **Shared Chromium launch** for E2E tests lives in [`test/helpers/extension-launch.ts`](../../test/helpers/extension-launch.ts). The Node store script duplicates the same logic in [`scripts/lib/extension-launch.mjs`](../../scripts/lib/extension-launch.mjs) — **keep both in sync** when changing launch flags or paths.
- **Compositing** helpers: [`scripts/composite-store-screenshot.mjs`](../../scripts/composite-store-screenshot.mjs).
- **Palette** loader: [`scripts/lib/store-palette.mjs`](../../scripts/lib/store-palette.mjs) + [`palette.json`](palette.json).

## Raw captures

Optional intermediate files can go under `raw/` (ignored by git if present). The pipeline writes final assets only under `generated/`.
