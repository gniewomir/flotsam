import {
  expect,
  openOptionsPage,
  syncStorageGet,
  tabExists,
  test,
  triggerCloseAlarm,
} from "./extension.fixture";

test("loads defaults in options page", async ({ context, extensionId }) => {
  const optionsPage = await openOptionsPage(context, extensionId);

  await expect(optionsPage.locator("#timeout")).toHaveValue("15");
  await expect(optionsPage.locator("#domain-list .empty-state")).toHaveText(
    "No domains excluded yet.",
  );
});

test("persists timeout changes to sync storage", async ({
  context,
  extensionId,
}) => {
  const optionsPage = await openOptionsPage(context, extensionId);

  await optionsPage.locator("#timeout").fill("5");
  await expect(optionsPage.locator("#timeout-status")).toHaveText("Saved.");
  await expect
    .poll(async () => syncStorageGet(optionsPage, "timeoutMinutes"))
    .toBe(5);
});

test("adds excluded domains with normalization", async ({ context, extensionId }) => {
  const optionsPage = await openOptionsPage(context, extensionId);

  await optionsPage.locator("#new-domain").fill("https://www.example.com/path");
  await optionsPage.locator("#add-domain-btn").click();

  await expect(optionsPage.locator("#domain-list li span")).toHaveText(
    "www.example.com",
  );
  await expect
    .poll(async () => syncStorageGet(optionsPage, "excludedDomains"))
    .toEqual(["www.example.com"]);
});

test("does not close tabs on excluded domains", async ({
  context,
  extensionId,
  serviceWorker,
}) => {
  const optionsPage = await openOptionsPage(context, extensionId);
  await optionsPage.locator("#new-domain").fill("example.com");
  await optionsPage.locator("#add-domain-btn").click();
  await expect
    .poll(async () => syncStorageGet(optionsPage, "excludedDomains"))
    .toEqual(["example.com"]);

  const protectedTabId = await serviceWorker.evaluate(async () => {
    const tab = await chrome.tabs.create({
      url: "https://www.example.com/",
      active: false,
    });
    return tab.id ?? -1;
  });
  expect(protectedTabId).toBeGreaterThan(0);

  await serviceWorker.evaluate(async () => {
    await chrome.tabs.create({ url: "about:blank", active: true });
  });

  await triggerCloseAlarm(serviceWorker, protectedTabId);
  await expect.poll(() => tabExists(serviceWorker, protectedTabId)).toBe(true);
});

test("schedules close alarms for managed tabs", async ({
  serviceWorker,
}) => {
  const tabId = await serviceWorker.evaluate(async () => {
    const tab = await chrome.tabs.create({
      url: "https://example.org/",
      active: false,
    });
    return tab.id ?? -1;
  });
  expect(tabId).toBeGreaterThan(0);

  await expect
    .poll(
      () =>
        serviceWorker.evaluate(async ({ id }) => {
          const alarm = await chrome.alarms.get(`close-tab-${id}`);
          return alarm !== undefined;
        }, { id: tabId }),
      { timeout: 20_000 },
    )
    .toBe(true);
});
