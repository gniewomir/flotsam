import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/release.mjs <version>");
  console.error("Example: node scripts/release.mjs 0.4.0");
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(
    `Invalid version format: "${version}". Expected semver like 1.2.3`,
  );
  process.exit(1);
}

function updateJsonFile(filePath, updater) {
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  updater(data);
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

const pkgPath = join(ROOT, "package.json");
updateJsonFile(pkgPath, (pkg) => {
  console.log(`package.json: ${pkg.version} -> ${version}`);
  pkg.version = version;
});

const manifestPath = join(ROOT, "src", "manifest.json");
updateJsonFile(manifestPath, (manifest) => {
  console.log(`src/manifest.json: ${manifest.version} -> ${version}`);
  manifest.version = version;
});

console.log("\nRunning npm install to sync package-lock.json...");
execSync("npm install --package-lock-only", { cwd: ROOT, stdio: "inherit" });

console.log("\nBuilding extension...");
execSync("npm run build", { cwd: ROOT, stdio: "inherit" });

const zipName = `flotsam-v${version}.zip`;
execSync(`rm -f "${zipName}"`, { cwd: ROOT });
execSync(`cd dist && zip -r "../${zipName}" .`, {
  cwd: ROOT,
  stdio: "inherit",
});

console.log("\nFixing formatting...");
execSync("npm run format", { cwd: ROOT, stdio: "inherit" });

const tag = `v${version}`;
console.log(`\nCommitting version bump and tagging as ${tag}...`);
execSync("git add package.json package-lock.json src/manifest.json", {
  cwd: ROOT,
  stdio: "inherit",
});
execSync(`git commit -m "release flotsam ${tag}"`, {
  cwd: ROOT,
  stdio: "inherit",
});
execSync(`git tag -a "${tag}" -m "release flotsam ${tag}"`, {
  cwd: ROOT,
  stdio: "inherit",
});

console.log(`\nReleased ${zipName} (tagged ${tag})`);
