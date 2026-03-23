import {
    test as base,
    expect,
    type BrowserContext,
    type Page,
    type Worker,
} from "@playwright/test";
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
    launchExtensionContext,
    waitForExtensionId,
    waitForServiceWorker,
} from "../helpers/extension-context";

type ExtensionFixture = {
    context: BrowserContext;
    extensionId: string;
    serviceWorker: Worker;
};

export const test = base.extend<ExtensionFixture>({
    // Playwright fixtures require object destructuring for the first parameter.
    // eslint-disable-next-line no-empty-pattern -- no upstream fixtures
    context: async ({}, use) => {
        const userDataDir = await mkdtemp(join(tmpdir(), "flotsam-e2e-"));
        const context = await launchExtensionContext({
            userDataDir,
            headless: process.env.HEADLESS === "1",
        });
        const bootstrapPage = await context.newPage();
        await bootstrapPage.goto("about:blank");

        await use(context);
        await context.close();
    },
    serviceWorker: async ({ context }, use) => {
        const serviceWorker = await waitForServiceWorker(context);
        await use(serviceWorker);
    },
    extensionId: async ({ context }, use) => {
        const extensionId = await waitForExtensionId(context);
        await use(extensionId);
    },
});

export async function openOptionsPage(context: BrowserContext, extensionId: string): Promise<Page> {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options/options.html`, {
        waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("#timeout:not([disabled])");
    await page.waitForSelector("#new-domain:not([disabled])");
    return page;
}

export async function triggerCloseAlarm(
    serviceWorker: Worker,
    tabId: number,
    delayMs = 500,
): Promise<void> {
    await serviceWorker.evaluate(
        async ({ id, delay }) => {
            await chrome.alarms.create(`close-tab-${id}`, {
                when: Date.now() + delay,
            });
        },
        { id: tabId, delay: delayMs },
    );
}

export async function tabExists(serviceWorker: Worker, tabId: number): Promise<boolean> {
    return serviceWorker.evaluate(
        async ({ id }) => {
            try {
                await chrome.tabs.get(id);
                return true;
            } catch {
                return false;
            }
        },
        { id: tabId },
    );
}

export async function syncStorageGet(page: Page, key: string): Promise<unknown> {
    return page.evaluate(async (storageKey) => {
        const values = await chrome.storage.sync.get([storageKey]);
        return values[storageKey];
    }, key);
}

export async function getCloseAlarmForTab(
    serviceWorker: Worker,
    tabId: number,
): Promise<{ scheduledTime?: number } | undefined> {
    return serviceWorker.evaluate(
        async ({ id }) => {
            return chrome.alarms.get(`close-tab-${id}`);
        },
        { id: tabId },
    );
}

export async function setActiveTab(serviceWorker: Worker, tabId: number): Promise<void> {
    await serviceWorker.evaluate(
        async ({ id }) => {
            await chrome.tabs.update(id, { active: true });
        },
        { id: tabId },
    );
}

export async function setPinned(
    serviceWorker: Worker,
    tabId: number,
    pinned: boolean,
): Promise<void> {
    await serviceWorker.evaluate(
        async ({ id, pinned: p }) => {
            await chrome.tabs.update(id, { pinned: p });
        },
        { id: tabId, pinned },
    );
}

/**
 * Dispatch to the service worker via `runtime.sendMessage` from an extension page
 * (e.g. options). Calling `sendMessage` from Playwright’s service-worker handle does
 * not reliably reach `onMessage` listeners in the extension.
 */
export async function e2eToggleAnchor(extensionPage: Page, tabId: number): Promise<void> {
    await extensionPage.evaluate(async (id) => {
        const response = await chrome.runtime.sendMessage({
            type: "e2e-toggle-anchor",
            tabId: id,
        });
        if (
            !response ||
            typeof response !== "object" ||
            !("ok" in response) ||
            !(response as { ok: boolean }).ok
        ) {
            throw new Error("e2e-toggle-anchor failed");
        }
    }, tabId);
}

export async function e2eExcludeDomainForTab(extensionPage: Page, tabId: number): Promise<void> {
    await extensionPage.evaluate(async (id) => {
        const response = await chrome.runtime.sendMessage({
            type: "e2e-exclude-domain",
            tabId: id,
        });
        if (
            !response ||
            typeof response !== "object" ||
            !("ok" in response) ||
            !(response as { ok: boolean }).ok
        ) {
            throw new Error("e2e-exclude-domain failed");
        }
    }, tabId);
}

export async function countCloseAlarms(serviceWorker: Worker): Promise<number> {
    return serviceWorker.evaluate(async () => {
        const all = await chrome.alarms.getAll();
        return all.filter((a) => a.name.startsWith("close-tab-")).length;
    });
}

export { expect };
