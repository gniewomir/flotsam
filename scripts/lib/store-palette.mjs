/**
 * Loads canonical store colors from branding/store/palette.json
 * and exposes Sharp-friendly RGBA plus HTML builders.
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PALETTE_PATH = join(__dirname, "..", "..", "branding", "store", "palette.json");

/** @returns {Record<string, unknown>} */
export function loadPalette() {
    const raw = readFileSync(PALETTE_PATH, "utf8");
    return JSON.parse(raw);
}

/**
 * @param {string} hex — #RRGGBB
 * @returns {{ r: number; g: number; b: number; alpha: number }}
 */
export function hexToRgba(hex) {
    const n = hex.replace("#", "").trim();
    if (n.length !== 6) {
        throw new Error(`Expected #RRGGBB, got ${hex}`);
    }
    return {
        r: parseInt(n.slice(0, 2), 16),
        g: parseInt(n.slice(2, 4), 16),
        b: parseInt(n.slice(4, 6), 16),
        alpha: 1,
    };
}

const _palette = loadPalette();

/** @type {typeof _palette} */
export const palette = _palette;

/** Sharp `background` objects derived from listing.canvas */
export const sharpListing = {
    canvas: hexToRgba(_palette.listing.canvas.hex),
    footerBar: hexToRgba(_palette.listing.footerBar.hex),
};

/**
 * Full-frame slide: header + behavior list (same copy as src/options/options.html).
 * Composed HTML — not a live options-page screenshot.
 */
export function getNeverAutoCloseSlideHtml() {
    const s = _palette.neverAutoCloseSlide;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    :root { color-scheme: light; }
    html, body {
      margin: 0;
      width: 1280px;
      height: 800px;
      box-sizing: border-box;
      background: linear-gradient(180deg, ${s.gradientTop.hex} 0%, ${s.gradientBottom.hex} 100%);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: ${s.body.hex};
      padding: 48px 72px 56px;
    }
    h1 {
      margin: 0 0 28px;
      font-size: 28px;
      font-weight: 600;
      line-height: 1.25;
      color: ${s.heading.hex};
    }
    h1 strong { font-weight: 700; color: ${s.body.hex}; }
    ul.behavior-list {
      margin: 0;
      padding-left: 1.35rem;
      font-size: 17px;
      line-height: 1.5;
      list-style-type: disc;
    }
    ul.behavior-list li { margin: 0.4em 0; }
    ul.behavior-list li::marker { color: ${s.bullet.hex}; }
    ul.behavior-list strong { font-weight: 700; color: ${s.body.hex}; }
  </style>
</head>
<body>
  <h1>Flotsam does <strong>not</strong> auto-close:</h1>
  <ul class="behavior-list">
    <li><strong>focused</strong> tab;</li>
    <li><strong>anchored</strong> tabs;</li>
    <li><strong>pinned</strong> tabs;</li>
    <li><strong>grouped</strong> tabs;</li>
    <li>tabs on <strong>excluded</strong> domains;</li>
    <li>
      tabs the browser treats as
      <strong>audible</strong> (playing sound). Muted tabs and silent playback
      are not treated as audible.
    </li>
    <li>
      tabs
      <strong>outside normal web domains</strong>
      (anything that isn’t a standard
      <strong>HTTP</strong> or <strong>HTTPS</strong> tab) — for example
      built-in browser pages, settings, or local files opened in the browser.
    </li>
  </ul>
</body>
</html>`;
}
