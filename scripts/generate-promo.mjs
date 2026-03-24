/**
 * Chrome Web Store promotional tiles (not listing screenshots).
 * Small: 440×280 (required). Marquee: 1400×560 (optional, for featured placement).
 * Keep text minimal per https://developer.chrome.com/docs/webstore/images#promo
 */
import { execSync } from "child_process";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { palette } from "./lib/store-palette.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "branding", "store", "generated");

function omitPromoGeneratedAt(obj) {
    if (!obj || typeof obj !== "object") return {};
    const { promoGeneratedAt, ...rest } = obj;
    return rest;
}

/**
 * Saturated gradient background; large anchor motif; minimal or no text.
 */
async function promoSmall() {
    const { smallGradient } = palette.promo;
    const iconPath = join(ROOT, "dist", "icons", "icon-anchored-128.png");
    const iconBuf = await readFile(iconPath);
    const icon = await sharp(iconBuf).resize(160, 160, { fit: "contain" }).png().toBuffer();

    const w = 440;
    const h = 280;
    const bg = Buffer.from(
        `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${smallGradient.start.hex}"/>
      <stop offset="100%" style="stop-color:${smallGradient.end.hex}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`,
    );

    return sharp(bg)
        .composite([{ input: icon, left: Math.round(w / 2 - 80), top: Math.round(h / 2 - 80) }])
        .png()
        .toBuffer();
}

async function promoMarquee() {
    const [s0, s1, s2] = palette.promo.marqueeGradient.stops;
    const floatingPath = join(ROOT, "dist", "icons", "icon-floating-128.png");
    const anchoredPath = join(ROOT, "dist", "icons", "icon-anchored-128.png");
    const [fBuf, aBuf] = await Promise.all([readFile(floatingPath), readFile(anchoredPath)]);
    const left = await sharp(fBuf).resize(200, 200, { fit: "contain" }).png().toBuffer();
    const right = await sharp(aBuf).resize(200, 200, { fit: "contain" }).png().toBuffer();

    const w = 1400;
    const h = 560;
    const bg = Buffer.from(
        `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gm" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${s0.hex}"/>
      <stop offset="50%" style="stop-color:${s1.hex}"/>
      <stop offset="100%" style="stop-color:${s2.hex}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#gm)"/>
</svg>`,
    );

    const top = Math.round(h / 2 - 100);
    return sharp(bg)
        .composite([
            { input: left, left: Math.round(w * 0.28 - 100), top },
            { input: right, left: Math.round(w * 0.72 - 100), top },
        ])
        .png()
        .toBuffer();
}

async function main() {
    if (process.env.FLOTSAM_SKIP_BUILD !== "1") {
        execSync("npm run build", { cwd: ROOT, stdio: "inherit" });
    }
    await mkdir(OUT, { recursive: true });
    const small = await promoSmall();
    await writeFile(join(OUT, "promo-small-440x280.png"), small);
    const marquee = await promoMarquee();
    await writeFile(join(OUT, "promo-marquee-1400x560.png"), marquee);

    const manifestPath = join(OUT, "manifest.json");
    let prior = {};
    try {
        prior = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch {
        /* no manifest yet */
    }
    const manifest = {
        ...omitPromoGeneratedAt(prior),
        promotional: [
            {
                file: "promo-small-440x280.png",
                dimensions: "440x280",
                description: "Small promotional image (required by CWS)",
            },
            {
                file: "promo-marquee-1400x560.png",
                dimensions: "1400x560",
                description: "Marquee promotional image (optional)",
            },
        ],
    };
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`Wrote promotional tiles to ${OUT}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
