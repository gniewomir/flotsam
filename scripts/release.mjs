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
    console.error("Working tree is not clean. Commit or stash changes before releasing.");
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

const semver = version.slice(1);

const currentPackageVersion = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8")).version;
const currentManifestVersion = JSON.parse(
    readFileSync(join(ROOT, "src", "manifest.json"), "utf-8"),
).version;
if (currentPackageVersion === semver && currentManifestVersion === semver) {
    console.error(
        `Version unchanged; nothing to release. package.json and src/manifest.json are already at "${semver}".`,
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
    console.log(`package.json: ${pkg.version} -> ${semver}`);
    pkg.version = semver;
});

const manifestPath = join(ROOT, "src", "manifest.json");
updateJsonFile(manifestPath, (manifest) => {
    console.log(`src/manifest.json: ${manifest.version} -> ${semver}`);
    manifest.version = semver;
});

console.log("\nFormating files...");
execSync("npm run prettier -- package.json package-lock.json src/manifest.json --write", {
    cwd: ROOT,
    stdio: "inherit",
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
execSync("npm run format", { cwd: ROOT, stdio: "inherit" });
const hasStagedChanges = execSync("git diff --cached --quiet; echo $?", {
    cwd: ROOT,
    encoding: "utf-8",
}).trim();
if (hasStagedChanges === "0") {
    console.error(`Version unchanged; nothing to release. No staged changes for ${tag}.`);
    process.exit(1);
}
execSync(`git commit -m "build: release flotsam ${tag}"`, {
    cwd: ROOT,
    stdio: "inherit",
});
execSync(`git tag -a "${tag}" -m "build: release flotsam ${tag}"`, {
    cwd: ROOT,
    stdio: "inherit",
});
execSync("git push origin main", {
    cwd: ROOT,
    stdio: "inherit",
});
execSync(`git push origin ${tag}`, {
    cwd: ROOT,
    stdio: "inherit",
});
