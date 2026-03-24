import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

execSync("rm -rf dist", { cwd: ROOT, stdio: "inherit" });

const e2e = process.env.FLOTSAM_E2E === "1";
const defineFlag = e2e ? "--define:FLOTSAM_E2E=true" : "--define:FLOTSAM_E2E=false";

execSync(
    `esbuild src/service-worker/background.ts src/options/options.ts --bundle --outdir=dist --target=es2022 --platform=browser --format=iife ${defineFlag}`,
    { cwd: ROOT, stdio: "inherit" },
);
execSync("cp src/manifest.json dist/", {
    cwd: ROOT,
    stdio: "inherit",
});
execSync("cp src/options/options.html dist/options/", {
    cwd: ROOT,
    stdio: "inherit",
});
execSync("cp branding/icons/anchor.svg dist/options/anchor.svg", {
    cwd: ROOT,
    stdio: "inherit",
});
execSync("node scripts/generate-icons.mjs", { cwd: ROOT, stdio: "inherit" });
execSync("node scripts/generate-promo.mjs", {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, FLOTSAM_SKIP_BUILD: "1" },
});
