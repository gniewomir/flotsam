import type { BrowserContext, Worker } from "@playwright/test";
import {
    launchExtensionContext,
    EXTENSION_PATH,
    resolveChromiumExecutablePath,
} from "./extension-launch";

export { EXTENSION_PATH, resolveChromiumExecutablePath, launchExtensionContext };

export async function waitForExtensionId(context: BrowserContext): Promise<string> {
    const serviceWorker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker", { timeout: 30_000 }));
    return new URL(serviceWorker.url()).host;
}

export async function waitForServiceWorker(context: BrowserContext): Promise<Worker> {
    const serviceWorker =
        context.serviceWorkers()[0] ??
        (await context.waitForEvent("serviceworker", { timeout: 30_000 }));
    return serviceWorker;
}
