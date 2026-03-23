import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ICONS_SRC = join(ROOT, "branding", "icons");
const OUT = join(ROOT, "dist", "icons");

const VARIANTS = [
    { name: "anchored", file: "anchor.svg" },
    { name: "floating", file: "floating.svg" },
];

const SIZES = [16, 24, 32, 48, 128];
const PADDED_SIZE = 128;
const PADDED_CONTENT = 96;

mkdirSync(OUT, { recursive: true });

for (const { name, file } of VARIANTS) {
    const svgBuffer = readFileSync(join(ICONS_SRC, file));

    for (const size of SIZES) {
        const outPath = join(OUT, `icon-${name}-${size}.png`);

        if (size === PADDED_SIZE) {
            const padding = (PADDED_SIZE - PADDED_CONTENT) / 2;
            await sharp(svgBuffer)
                .resize(PADDED_CONTENT, PADDED_CONTENT)
                .extend({
                    top: padding,
                    bottom: padding,
                    left: padding,
                    right: padding,
                    background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .png()
                .toFile(outPath);
        } else {
            await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
        }
    }

    console.log(`Generated icons for "${name}" variant`);
}
