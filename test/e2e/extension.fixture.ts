import {
  test as base,
  chromium,
  expect,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";
import { existsSync } from "fs";
import { mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";

const extensionPath = resolve(process.cwd(), "dist");

function resolveChromiumExecutablePath(): string | undefined {
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

type ExtensionFixture = {
  context: BrowserContext;
  extensionId: string;
  serviceWorker: Worker;
};

export const test = base.extend<ExtensionFixture>({
  context: async ({}, use) => {
    const userDataDir = await mkdtemp(join(tmpdir(), "flotsam-e2e-"));
    const executablePath = resolveChromiumExecutablePath();
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: executablePath ? undefined : "chromium",
      executablePath,
      headless: process.env.HEADLESS === "1",
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    const bootstrapPage = await context.newPage();
    await bootstrapPage.goto("about:blank");

    await use(context);
    await context.close();
  },
  serviceWorker: async ({ context }, use) => {
    const serviceWorker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker", { timeout: 30_000 }));
    await use(serviceWorker);
  },
  extensionId: async ({ serviceWorker }, use) => {
    const extensionId = new URL(serviceWorker.url()).host;
    await use(extensionId);
  },
});

export async function openOptionsPage(
  context: BrowserContext,
  extensionId: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options/options.html`);
  await page.waitForSelector("#timeout:not([disabled])");
  await page.waitForSelector("#new-domain:not([disabled])");
  return page;
}

export async function triggerCloseAlarm(
  serviceWorker: Worker,
  tabId: number,
): Promise<void> {
  await serviceWorker.evaluate(
    async ({ id }) => {
      await chrome.alarms.create(`close-tab-${id}`, {
        when: Date.now() + 50,
      });
    },
    { id: tabId },
  );
}

export async function tabExists(
  serviceWorker: Worker,
  tabId: number,
): Promise<boolean> {
  return serviceWorker.evaluate(async ({ id }) => {
    try {
      await chrome.tabs.get(id);
      return true;
    } catch {
      return false;
    }
  }, { id: tabId });
}

export async function syncStorageGet(
  page: Page,
  key: string,
): Promise<unknown> {
  return page.evaluate(async (storageKey) => {
    const values = await chrome.storage.sync.get([storageKey]);
    return values[storageKey];
  }, key);
}

export { expect };
