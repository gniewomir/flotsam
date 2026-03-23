import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

execSync("npm run typecheck");
execSync("npm run lint");
execSync("npm run format:check", { stdio: "inherit", shell: true });
execSync("npm run test");
