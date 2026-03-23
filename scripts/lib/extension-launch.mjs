/**
 * Chromium + unpacked-extension launch for Node scripts (store asset generation).
 * Keep in sync with test/helpers/extension-launch.ts
 * @typedef {{ userDataDir: string; headless?: boolean }} LaunchOptions
 */
import { chromium } from "playwright";
import { existsSync } from "fs";
import { join, resolve } from "path";

export const EXTENSION_PATH = resolve(process.cwd(), "dist");

/**
 * @returns {string | undefined}
 */
export function resolveChromiumExecutablePath() {
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
        return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    }

    const browsersRoot = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (!browsersRoot) {
        return undefined;
    }

    const armPath = join(
        browsersRoot,
        "chromium-1208",
        "chrome-mac-arm64",
        "Google Chrome for Testing.app",
        "Contents",
        "MacOS",
        "Google Chrome for Testing",
    );
    if (existsSync(armPath)) {
        return armPath;
    }

    const x64Path = join(
        browsersRoot,
        "chromium-1208",
        "chrome-mac-x64",
        "Google Chrome for Testing.app",
        "Contents",
        "MacOS",
        "Google Chrome for Testing",
    );
    if (existsSync(x64Path)) {
        return x64Path;
    }

    return undefined;
}

/**
 * @param {LaunchOptions} options
 */
export async function launchExtensionContext(options) {
    const { userDataDir, headless = false } = options;
    const executablePath = resolveChromiumExecutablePath();
    const context = await chromium.launchPersistentContext(userDataDir, {
        channel: executablePath ? undefined : "chromium",
        executablePath,
        headless,
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
        ],
    });
    return context;
}
