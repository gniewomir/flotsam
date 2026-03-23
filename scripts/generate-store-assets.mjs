/**
 * Generate Chrome Web Store listing screenshots (1280×800) into branding/store/generated/
 * Prerequisites: npm run build (invoked automatically).
 */
import { execSync } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { launchExtensionContext } from "./lib/extension-launch.mjs";
import {
    composeFloatingVsAnchored,
    composeHeroSlide,
    fitCardScreenshotToStore,
    fitToStore,
} from "./composite-store-screenshot.mjs";
import { getNeverAutoCloseSlideHtml } from "./lib/store-palette.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const GENERATED = join(ROOT, "branding", "store", "generated");

async function waitForExtensionId(context) {
    const sw =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker", { timeout: 60_000 }));
    return new URL(sw.url()).host;
}

async function main() {
    execSync("npm run build", { cwd: ROOT, stdio: "inherit" });

    await mkdir(GENERATED, { recursive: true });

    // 01–02: Sharp-only (no Chromium; dist/ must exist from build above)
    const heroBuf = await composeHeroSlide(ROOT);
    await writeFile(join(GENERATED, "01-hero-stale-tabs.png"), heroBuf);

    const anchorBuf = await composeFloatingVsAnchored(ROOT);
    await writeFile(join(GENERATED, "02-floating-vs-anchored.png"), anchorBuf);

    const headless = process.env.HEADLESS === "1";
    const userDataDir = await mkdtemp(join(tmpdir(), "flotsam-store-"));
    const context = await launchExtensionContext({ userDataDir, headless });

    try {
        const extensionId = await waitForExtensionId(context);

        const page = await context.newPage();
        await page.setViewportSize({ width: 1280, height: 800 });

        // Options-driven captures
        await page.goto(`chrome-extension://${extensionId}/options/options.html`, {
            waitUntil: "domcontentloaded",
        });
        await page.waitForSelector("#timeout:not([disabled])", { timeout: 30_000 });
        await page.waitForSelector("#new-domain:not([disabled])");

        let raw;
        let out;

        // 03 — timeout card
        await page.locator("#timeout").fill("5");
        await page
            .locator("#timeout-status")
            .filter({ hasText: "Saved." })
            .waitFor({ timeout: 10_000 });
        const timeoutCard = page.locator("#settings .card").first();
        raw = await timeoutCard.screenshot({ type: "png" });
        out = await fitCardScreenshotToStore(raw);
        await writeFile(join(GENERATED, "03-auto-close-timeout.png"), out);

        // 04 — excluded domains card
        await page.locator("#new-domain").fill("example.com");
        await page.locator("#add-domain-btn").click();
        await page.locator("#domain-list li span").filter({ hasText: "example.com" }).waitFor({
            timeout: 10_000,
        });
        const excludedCard = page.locator("#excluded-domains");
        raw = await excludedCard.screenshot({ type: "png" });
        out = await fitCardScreenshotToStore(raw);
        await writeFile(join(GENERATED, "04-excluded-domains.png"), out);

        // 06 — never auto-closes (composed HTML slide; copy matches options About list)
        const neverPage = await context.newPage();
        await neverPage.setViewportSize({ width: 1280, height: 800 });
        await neverPage.setContent(getNeverAutoCloseSlideHtml(), { waitUntil: "domcontentloaded" });
        raw = await neverPage.screenshot({ type: "png" });
        out = await fitToStore(raw);
        await writeFile(join(GENERATED, "06-never-auto-closes.png"), out);
        await neverPage.close();

        const manifest = {
            generatedAt: new Date().toISOString(),
            dimensions: "1280x800",
            note: "Five listing screenshots (Chrome Web Store max per locale).",
            screenshots: [
                {
                    file: "01-hero-stale-tabs.png",
                    description:
                        "Hero: Flotsam name, tagline, large icon, palette gradient (Sharp)",
                },
                {
                    file: "02-floating-vs-anchored.png",
                    description: "Toolbar icon meanings (floating vs anchored)",
                },
                {
                    file: "03-auto-close-timeout.png",
                    description: "Options: auto-close timeout",
                },
                {
                    file: "04-excluded-domains.png",
                    description: "Options: excluded domains",
                },
                {
                    file: "06-never-auto-closes.png",
                    description:
                        "Never auto-close: composed HTML slide (palette, same copy as About)",
                },
            ],
        };
        await writeFile(join(GENERATED, "manifest.json"), JSON.stringify(manifest, null, 2));

        console.log(`Wrote listing images to ${GENERATED}`);
    } finally {
        await context.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
