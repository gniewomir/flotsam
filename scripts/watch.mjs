import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

execSync("mkdir -p dist", { cwd: ROOT, stdio: "inherit" });
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
execSync(
    "esbuild src/service-worker/background.ts src/options/options.ts --bundle --outdir=dist --target=es2022 --platform=browser --format=iife --define:FLOTSAM_E2E=false --watch",
    { cwd: ROOT, stdio: "inherit" },
);
