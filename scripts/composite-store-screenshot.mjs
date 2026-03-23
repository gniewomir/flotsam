/**
 * Resize and compose Chrome Web Store listing images (1280×800, 16:10).
 * @see https://developer.chrome.com/docs/webstore/images
 * Colors: branding/store/palette.json (via ./lib/store-palette.mjs)
 */
import sharp from "sharp";
import { readFile } from "fs/promises";
import { join } from "path";
import { palette, sharpListing } from "./lib/store-palette.mjs";

export const STORE_W = 1280;
export const STORE_H = 800;

/**
 * Fit arbitrary screenshot into 1280×800 with letterboxing.
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
export async function fitToStore(buffer) {
    return sharp(buffer)
        .resize(STORE_W, STORE_H, {
            fit: "contain",
            position: "center",
            background: sharpListing.canvas,
        })
        .png()
        .toBuffer();
}

/**
 * Options card element screenshot: scale down so the card sits inside a max box, then center
 * on 1280×800 with listing.canvas (blueish) as margin — no HTML padding tricks.
 * Ratios: palette.listing.cardFrame
 * @param {Buffer} buffer
 * @returns {Promise<Buffer>}
 */
export async function fitCardScreenshotToStore(buffer) {
    const frame = palette.listing.cardFrame;
    const maxWidthRatio = typeof frame?.maxWidthRatio === "number" ? frame.maxWidthRatio : 1;
    const maxHeightRatio = typeof frame?.maxHeightRatio === "number" ? frame.maxHeightRatio : 1;
    const maxW = STORE_W * maxWidthRatio;
    const maxH = STORE_H * maxHeightRatio;

    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 1;
    const h = meta.height ?? 1;
    const scale = Math.min(maxW / w, maxH / h, 1);
    const newW = Math.max(1, Math.round(w * scale));
    const newH = Math.max(1, Math.round(h * scale));

    const resized = await sharp(buffer).resize(newW, newH).png().toBuffer();
    const left = Math.round((STORE_W - newW) / 2);
    const top = Math.round((STORE_H - newH) / 2);

    return sharp({
        create: {
            width: STORE_W,
            height: STORE_H,
            channels: 4,
            background: sharpListing.canvas,
        },
    })
        .composite([{ input: resized, left, top }])
        .png()
        .toBuffer();
}

const EXTENSION_NAME = "Flotsam";
/** Two short lines (store hero); behavior matches src/manifest.json */
const HERO_SUBTITLE_LINE1 = "Auto-close tabs after a set time unless you anchor them.";
const HERO_SUBTITLE_LINE2 = "Click the toolbar icon to anchor tabs you want to keep.";

/**
 * Store listing hero (01): large anchored icon, blueish gradient, name + subtitle. Pure Sharp.
 * @param {string} repoRoot
 * @returns {Promise<Buffer>}
 */
export async function composeHeroSlide(repoRoot) {
    const h = palette.heroSlide;
    if (!h?.gradientTop?.hex || !h?.gradientBottom?.hex) {
        throw new Error("palette.heroSlide (gradientTop, gradientBottom) is required");
    }

    const iconPath = join(repoRoot, "dist/icons/icon-anchored-128.png");
    const iconBuf = await readFile(iconPath);
    const iconSize = 280;
    const iconResized = await sharp(iconBuf)
        .resize(iconSize, iconSize, { fit: "contain" })
        .png()
        .toBuffer();

    const titleFont = 56;
    const subFont = 24;
    const gapIconTitle = 40;
    const gapTitleSub = 24;
    const gapSubLines = 12;
    const titleLineH = titleFont * 1.15;
    const subLineH = subFont * 1.25;
    const stackH =
        iconSize + gapIconTitle + titleLineH + gapTitleSub + subLineH + gapSubLines + subLineH;
    const topBlock = (STORE_H - stackH) / 2;

    const titleY = topBlock + iconSize + gapIconTitle + titleLineH / 2;
    const sub1Y = topBlock + iconSize + gapIconTitle + titleLineH + gapTitleSub + subLineH / 2;
    const sub2Y = sub1Y + subLineH + gapSubLines;

    const bgSvg = Buffer.from(
        `<svg width="${STORE_W}" height="${STORE_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="heroBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${h.gradientTop.hex}"/>
      <stop offset="100%" stop-color="${h.gradientBottom.hex}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#heroBg)"/>
</svg>`,
    );

    const textSvg = Buffer.from(
        `<svg width="${STORE_W}" height="${STORE_H}" xmlns="http://www.w3.org/2000/svg">
  <text x="50%" y="${titleY}" text-anchor="middle" dominant-baseline="middle" fill="${h.title.hex}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${titleFont}" font-weight="700">${EXTENSION_NAME}</text>
  <text x="50%" y="${sub1Y}" text-anchor="middle" dominant-baseline="middle" fill="${h.subtitle.hex}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${subFont}" font-weight="500">${escapeXml(HERO_SUBTITLE_LINE1)}</text>
  <text x="50%" y="${sub2Y}" text-anchor="middle" dominant-baseline="middle" fill="${h.subtitle.hex}" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${subFont}" font-weight="500">${escapeXml(HERO_SUBTITLE_LINE2)}</text>
</svg>`,
    );

    const iconLeft = Math.round(STORE_W / 2 - iconSize / 2);
    const iconTop = Math.round(topBlock);

    return sharp({
        create: {
            width: STORE_W,
            height: STORE_H,
            channels: 4,
            background: sharpListing.canvas,
        },
    })
        .composite([
            { input: bgSvg, left: 0, top: 0 },
            { input: iconResized, left: iconLeft, top: iconTop },
            { input: textSvg, left: 0, top: 0 },
        ])
        .png()
        .toBuffer();
}

/**
 * @param {string} s
 */
function escapeXml(s) {
    return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

/**
 * Two-column explainer: floating vs anchored icons (matches toolbar titles in anchor.ts).
 * @param {string} repoRoot
 * @returns {Promise<Buffer>}
 */
export async function composeFloatingVsAnchored(repoRoot) {
    const floatingPng = join(repoRoot, "dist/icons/icon-floating-128.png");
    const anchoredPng = join(repoRoot, "dist/icons/icon-anchored-128.png");
    const [leftBuf, rightBuf] = await Promise.all([readFile(floatingPng), readFile(anchoredPng)]);

    const colW = STORE_W / 2;
    /** Scale vs original 20px / 14px / 128px layout */
    const CONTENT_SCALE = 1.3;
    const titleFont = Math.round(20 * CONTENT_SCALE);
    const subFont = Math.round(14 * CONTENT_SCALE);
    const iconSize = Math.round(128 * CONTENT_SCALE);
    const gap1 = Math.round(20 * CONTENT_SCALE);
    const gap2 = Math.round(20 * CONTENT_SCALE);
    const titleLineH = titleFont * 1.2;
    const subLineH = subFont * 1.2;
    const stackH = titleLineH + gap1 + iconSize + gap2 + subLineH;
    const topBlock = (STORE_H - stackH) / 2;

    const titleY = topBlock + titleLineH / 2;
    const iconTop = Math.round(topBlock + titleLineH + gap1);
    const subtitleY = topBlock + titleLineH + gap1 + iconSize + gap2 + subLineH / 2;

    const { splitPanel } = palette;

    const leftIcon = await sharp(leftBuf)
        .resize(iconSize, iconSize, { fit: "contain" })
        .png()
        .toBuffer();
    const rightIcon = await sharp(rightBuf)
        .resize(iconSize, iconSize, { fit: "contain" })
        .png()
        .toBuffer();

    const leftSvg = Buffer.from(
        `<svg width="${colW}" height="${STORE_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${splitPanel.leftBackground.hex}"/>
  <text x="50%" y="${titleY}" text-anchor="middle" dominant-baseline="middle" fill="${splitPanel.heading.hex}" font-family="system-ui, -apple-system, sans-serif" font-size="${titleFont}" font-weight="600">Floating</text>
  <text x="50%" y="${subtitleY}" text-anchor="middle" dominant-baseline="middle" fill="${splitPanel.subtitle.hex}" font-family="system-ui, -apple-system, sans-serif" font-size="${subFont}">Flotsam (will auto-close)</text>
</svg>`,
    );
    const rightSvg = Buffer.from(
        `<svg width="${colW}" height="${STORE_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${splitPanel.rightBackground.hex}"/>
  <text x="50%" y="${titleY}" text-anchor="middle" dominant-baseline="middle" fill="${splitPanel.heading.hex}" font-family="system-ui, -apple-system, sans-serif" font-size="${titleFont}" font-weight="600">Anchored</text>
  <text x="50%" y="${subtitleY}" text-anchor="middle" dominant-baseline="middle" fill="${splitPanel.subtitle.hex}" font-family="system-ui, -apple-system, sans-serif" font-size="${subFont}">Flotsam (anchored)</text>
</svg>`,
    );

    const iconLeftX = Math.round(colW / 2 - iconSize / 2);
    const iconRightX = Math.round(colW + colW / 2 - iconSize / 2);

    return sharp({
        create: {
            width: STORE_W,
            height: STORE_H,
            channels: 4,
            background: sharpListing.canvas,
        },
    })
        .composite([
            { input: leftSvg, left: 0, top: 0 },
            { input: rightSvg, left: colW, top: 0 },
            { input: leftIcon, left: iconLeftX, top: iconTop },
            { input: rightIcon, left: iconRightX, top: iconTop },
        ])
        .png()
        .toBuffer();
}
