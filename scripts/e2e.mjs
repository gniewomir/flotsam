import { execSync, spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const playwrightCli = join(
    ROOT,
    "node_modules",
    "@playwright",
    "test",
    "cli.js",
);

const rawArgs = process.argv.slice(2);
const headless = rawArgs.includes("--headless");
const pwArgs = rawArgs.filter((a) => a !== "--headless");

execSync("node scripts/build.mjs", {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, FLOTSAM_E2E: "1" },
});

const env = { ...process.env };
if (headless) {
    env.HEADLESS = "1";
}

const result = spawnSync(
    process.execPath,
    [playwrightCli, "test", "-c", "test/playwright.config.ts", ...pwArgs],
    { cwd: ROOT, env, stdio: "inherit" },
);

process.exit(result.status === null ? 1 : result.status);
