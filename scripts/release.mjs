import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/release.mjs <version>");
  console.error("Example: node scripts/release.mjs v0.4.0");
  process.exit(1);
}

if (!/^v\d+\.\d+\.\d+$/.test(version)) {
  console.error(
    `Invalid version format: "${version}". Expected semver with v prefix, e.g. v1.2.3`,
  );
  process.exit(1);
}

const dirty = execSync("git status --porcelain", {
  cwd: ROOT,
  encoding: "utf-8",
}).trim();
if (dirty) {
  console.error(
    "Working tree is not clean. Commit or stash changes before releasing.",
  );
  process.exit(1);
}

const branch = execSync("git branch --show-current", {
  cwd: ROOT,
  encoding: "utf-8",
}).trim();
if (branch !== "main") {
  console.error(
    branch
      ? `Release must be run from branch main (currently on "${branch}").`
      : "Release must be run from branch main (detached HEAD).",
  );
  process.exit(1);
}

console.log("\nTesting formatting...");
execSync("npm run format:check", { cwd: ROOT, stdio: "inherit" });
console.log("\nTesting extension...");
execSync("npm run test", { cwd: ROOT, stdio: "inherit" });
execSync("npm run test:e2e:headless", { cwd: ROOT, stdio: "inherit" });

const semver = version.slice(1);

function updateJsonFile(filePath, updater) {
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  updater(data);
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

const pkgPath = join(ROOT, "package.json");
updateJsonFile(pkgPath, (pkg) => {
  console.log(`package.json: ${pkg.version} -> ${semver}`);
  pkg.version = semver;
});

const manifestPath = join(ROOT, "src", "manifest.json");
updateJsonFile(manifestPath, (manifest) => {
  console.log(`src/manifest.json: ${manifest.version} -> ${semver}`);
  manifest.version = semver;
});

console.log("\nRunning npm install to sync package-lock.json...");
execSync("npm install --package-lock-only", { cwd: ROOT, stdio: "inherit" });

console.log("\nBuilding extension...");
execSync("npm run build", { cwd: ROOT, stdio: "inherit" });

const tag = version;
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
execSync(`git push`, {
  cwd: ROOT,
  stdio: "inherit",
});
execSync(`git push origin tag ${tag}`, {
  cwd: ROOT,
  stdio: "inherit",
});
