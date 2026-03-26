import {
    countCloseAlarms,
    e2eExcludeDomainForTab,
    e2eToggleAnchor,
    expect,
    getCloseAlarmForTab,
    openOptionsPage,
    setPinned,
    syncStorageGet,
    tabExists,
    test,
    triggerCloseAlarm,
} from "./extension.fixture";

test.describe("options page copy", () => {
    test("surfaces key settings and about phrases", async ({ context, extensionId }) => {
        const page = await openOptionsPage(context, extensionId);

        await expect(page.locator('label[for="timeout"]')).toContainText("resets all timers");
        await expect(page.locator("#timeout")).toHaveAttribute("min", "1");
        await expect(page.locator("#timeout")).toHaveAttribute("max", "1440");

        await expect(page.locator("#excluded-domains p").first()).toContainText(
            "never be auto-closed",
        );

        const about = page.locator("#about");
        await expect(about).toContainText("HTTP");
        await expect(about).toContainText("HTTPS");
        await expect(about).toContainText("toolbar icon");
        await expect(about).toContainText("anchor");
        await expect(about).toContainText("Exclude tab domain");
        const bullets = about.locator(".behavior-list li");
        await expect(bullets.filter({ hasText: /focused/ })).toHaveCount(1);
        await expect(bullets.filter({ hasText: /anchored/ })).toHaveCount(1);
        await expect(bullets.filter({ hasText: /pinned/ })).toHaveCount(1);
        await expect(bullets.filter({ hasText: /grouped/ })).toHaveCount(1);
        await expect(bullets.filter({ hasText: /excluded/ })).toHaveCount(1);
        await expect(bullets.filter({ hasText: /audible/ })).toHaveCount(1);
    });

    test("support links have expected href and rel", async ({ context, extensionId }) => {
        const page = await openOptionsPage(context, extensionId);
        const support = page.locator("#support");

        const issue = support.getByRole("link", { name: "Open an issue" });
        await expect(issue).toHaveAttribute("href", "https://github.com/gniewomir/flotsam/issues");
        await expect(issue).toHaveAttribute("target", "_blank");
        await expect(issue).toHaveAttribute("rel", /noopener/);

        const contributing = support.getByRole("link", {
            name: "Read the contributing guide",
        });
        await expect(contributing).toHaveAttribute(
            "href",
            "https://github.com/gniewomir/flotsam/blob/main/CONTRIBUTING.md",
        );

        await expect(support.getByRole("link", { name: "Buy Me a Coffee" })).toHaveAttribute(
            "href",
            "https://ko-fi.com/I3I61GPLRC",
        );

        await expect(support.getByRole("link", { name: "Visit my blog" })).toHaveAttribute(
            "href",
            "https://gniewomir.com",
        );

        await expect(support.getByRole("link", { name: "Drop me an email" })).toHaveAttribute(
            "href",
            "mailto:gniewomir.swiechowski+flotsam@gmail.com",
        );
    });
});

test("loads defaults in options page", async ({ context, extensionId }) => {
    const optionsPage = await openOptionsPage(context, extensionId);

    await expect(optionsPage.locator("#timeout")).toHaveValue("15");
    await expect(optionsPage.locator("#domain-list .empty-state")).toHaveText(
        "No domains excluded yet.",
    );
});

test("persists timeout changes to sync storage", async ({ context, extensionId }) => {
    const optionsPage = await openOptionsPage(context, extensionId);

    await optionsPage.locator("#timeout").fill("5");
    await expect(optionsPage.locator("#timeout-status")).toHaveText("Saved.");
    await expect.poll(async () => syncStorageGet(optionsPage, "timeoutMinutes")).toBe(5);
});

test("adds excluded domains with normalization", async ({ context, extensionId }) => {
    const optionsPage = await openOptionsPage(context, extensionId);

    await optionsPage.locator("#new-domain").fill("https://www.example.com/path");
    await optionsPage.locator("#add-domain-btn").click();

    await expect(optionsPage.locator("#domain-list li span")).toHaveText("www.example.com");
    await expect
        .poll(async () => syncStorageGet(optionsPage, "excludedDomains"))
        .toEqual(["www.example.com"]);
});

test("removes excluded domains", async ({ context, extensionId }) => {
    const optionsPage = await openOptionsPage(context, extensionId);

    await optionsPage.locator("#new-domain").fill("example.com");
    await optionsPage.locator("#add-domain-btn").click();

    await expect(optionsPage.locator("#domain-list li span")).toHaveText("example.com");
    await expect
        .poll(async () => syncStorageGet(optionsPage, "excludedDomains"))
        .toEqual(["example.com"]);

    await optionsPage.getByRole("button", { name: "Remove example.com from exclusions" }).click();
    await expect(optionsPage.locator("#domain-list li")).toHaveCount(0);
    await expect.poll(async () => syncStorageGet(optionsPage, "excludedDomains")).toEqual([]);
});

test("removes excluded domains with overlap", async ({ context, extensionId }) => {
    const optionsPage = await openOptionsPage(context, extensionId);

    await optionsPage.locator("#new-domain").fill("amazon.com");
    await optionsPage.locator("#add-domain-btn").click();
    await optionsPage.locator("#new-domain").fill("aws.amazon.com");
    await optionsPage.locator("#add-domain-btn").click();

    await expect(optionsPage.locator("#domain-list li span")).toHaveText("aws.amazon.com");
    await expect
        .poll(async () => syncStorageGet(optionsPage, "excludedDomains"))
        .toEqual(["amazon.com", "aws.amazon.com"]);

    await optionsPage
        .getByRole("button", { name: "Remove aws.amazon.com from exclusions" })
        .click();
    await expect(optionsPage.locator("#domain-list li")).toHaveCount(1);
    await expect
        .poll(async () => syncStorageGet(optionsPage, "excludedDomains"))
        .toEqual(["amazon.com"]);
});

test("options updates recover after a single failed sync storage write", async ({
    context,
    extensionId,
}) => {
    const optionsPage = await openOptionsPage(context, extensionId);

    await optionsPage.evaluate(() => {
        const originalSet = chrome.storage.sync.set.bind(chrome.storage.sync);
        let rejected = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- patching Chrome API for e2e
        (chrome.storage.sync as any).set = async (...args: unknown[]) => {
            if (!rejected) {
                rejected = true;
                throw new Error("e2e: forced chrome.storage.sync.set failure");
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- passthrough
            return originalSet(...(args as Parameters<typeof chrome.storage.sync.set>));
        };
    });

    // First attempt fails, but should not permanently break subsequent updates.
    await optionsPage.locator("#new-domain").fill("example.com");
    await optionsPage.locator("#add-domain-btn").click();
    await expect(optionsPage.locator("#domain-list li")).toHaveCount(0);
    await expect
        .poll(async () => {
            const value = await syncStorageGet(optionsPage, "excludedDomains");
            if (value === undefined) return 0;
            if (Array.isArray(value)) return value.length;
            return -1;
        })
        .toBe(0);

    // Next attempts succeed.
    await optionsPage.locator("#new-domain").fill("example.com");
    await optionsPage.locator("#add-domain-btn").click();
    await expect(optionsPage.locator("#domain-list li span")).toHaveText("example.com");
    await expect
        .poll(async () => syncStorageGet(optionsPage, "excludedDomains"))
        .toEqual(["example.com"]);

    await optionsPage.locator("#timeout").fill("11");
    await expect(optionsPage.locator("#timeout-status")).toHaveText("Saved.");
    await expect.poll(async () => syncStorageGet(optionsPage, "timeoutMinutes")).toBe(11);
});

test("does not close tabs on excluded domains", async ({ context, extensionId, serviceWorker }) => {
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

test("schedules close alarms for https and http managed tabs", async ({ serviceWorker }) => {
    const httpsId = await serviceWorker.evaluate(async () => {
        const tab = await chrome.tabs.create({
            url: "https://example.org/",
            active: false,
        });
        return tab.id ?? -1;
    });
    const httpId = await serviceWorker.evaluate(async () => {
        const tab = await chrome.tabs.create({
            url: "http://example.com/",
            active: false,
        });
        return tab.id ?? -1;
    });
    expect(httpsId).toBeGreaterThan(0);
    expect(httpId).toBeGreaterThan(0);

    await expect
        .poll(
            () =>
                serviceWorker.evaluate(
                    async ({ a, b }) => {
                        const [aa, bb] = await Promise.all([
                            chrome.alarms.get(`close-tab-${a}`),
                            chrome.alarms.get(`close-tab-${b}`),
                        ]);
                        return aa !== undefined && bb !== undefined;
                    },
                    { a: httpsId, b: httpId },
                ),
            { timeout: 20_000 },
        )
        .toBe(true);
});

test("does not schedule close alarms for about:blank", async ({ serviceWorker }) => {
    const tabId = await serviceWorker.evaluate(async () => {
        const tab = await chrome.tabs.create({
            url: "about:blank",
            active: false,
        });
        return tab.id ?? -1;
    });
    expect(tabId).toBeGreaterThan(0);

    await expect.poll(async () => getCloseAlarmForTab(serviceWorker, tabId)).toBeUndefined();
});

test("does not close the active tab when its close alarm fires (reschedules instead)", async ({
    serviceWorker,
}) => {
    const soloTabId = await serviceWorker.evaluate(async () => {
        const tab = await chrome.tabs.create({
            url: "https://example.com/solo-active",
            active: true,
        });
        return tab.id ?? -1;
    });
    await triggerCloseAlarm(serviceWorker, soloTabId);
    await expect.poll(() => tabExists(serviceWorker, soloTabId), { timeout: 15_000 }).toBe(true);
});

test("reschedules close alarms when timeout changes in options", async ({
    context,
    extensionId,
    serviceWorker,
}) => {
    const tabId = await serviceWorker.evaluate(async () => {
        const tab = await chrome.tabs.create({
            url: "https://example.com/timeout-reschedule",
            active: false,
        });
        return tab.id ?? -1;
    });
    expect(tabId).toBeGreaterThan(0);

    await expect.poll(() => getCloseAlarmForTab(serviceWorker, tabId)).toBeDefined();

    const before = await getCloseAlarmForTab(serviceWorker, tabId);
    expect(before?.scheduledTime).toBeDefined();

    const optionsPage = await openOptionsPage(context, extensionId);
    await optionsPage.locator("#timeout").fill("10");
    await expect(optionsPage.locator("#timeout-status")).toHaveText("Saved.");

    await expect
        .poll(async () => {
            const after = await getCloseAlarmForTab(serviceWorker, tabId);
            return after !== undefined && after.scheduledTime !== before!.scheduledTime;
        })
        .toBe(true);
});

test("does not close pinned tabs when alarm fires", async ({ serviceWorker }) => {
    const tabId = await serviceWorker.evaluate(async () => {
        const tab = await chrome.tabs.create({
            url: "https://example.com/pinned-tab",
            active: true,
        });
        return tab.id ?? -1;
    });
    expect(tabId).toBeGreaterThan(0);

    await setPinned(serviceWorker, tabId, true);
    await serviceWorker.evaluate(async () => {
        await chrome.tabs.create({ url: "about:blank", active: true });
    });

    await triggerCloseAlarm(serviceWorker, tabId);
    await expect.poll(() => tabExists(serviceWorker, tabId)).toBe(true);
});

test("e2e hook: anchored tab survives alarm", async ({ context, extensionId, serviceWorker }) => {
    const optionsPage = await openOptionsPage(context, extensionId);
    const tabId = await serviceWorker.evaluate(async () => {
        const tab = await chrome.tabs.create({
            url: "https://example.com/anchor-e2e",
            active: true,
        });
        return tab.id ?? -1;
    });
    expect(tabId).toBeGreaterThan(0);

    await e2eToggleAnchor(optionsPage, tabId);
    await serviceWorker.evaluate(async () => {
        await chrome.tabs.create({ url: "about:blank", active: true });
    });

    await triggerCloseAlarm(serviceWorker, tabId);
    await expect.poll(() => tabExists(serviceWorker, tabId)).toBe(true);
});

test("e2e hook: exclude domain from tab updates sync storage", async ({
    context,
    extensionId,
    serviceWorker,
}) => {
    const optionsPage = await openOptionsPage(context, extensionId);
    const tabId = await serviceWorker.evaluate(async () => {
        const tab = await chrome.tabs.create({
            url: "https://example.com/exclude-hook",
            active: true,
        });
        return tab.id ?? -1;
    });
    expect(tabId).toBeGreaterThan(0);

    await e2eExcludeDomainForTab(optionsPage, tabId);
    await expect
        .poll(async () => syncStorageGet(optionsPage, "excludedDomains"), {
            timeout: 15_000,
        })
        .toEqual(["example.com"]);
});

test("timeout change clears and recreates close-tab alarms", async ({
    context,
    extensionId,
    serviceWorker,
}) => {
    await serviceWorker.evaluate(async () => {
        await chrome.tabs.create({
            url: "https://example.com/alarm-count",
            active: false,
        });
    });

    await expect.poll(async () => countCloseAlarms(serviceWorker)).toBeGreaterThan(0);

    const before = await countCloseAlarms(serviceWorker);

    const optionsPage = await openOptionsPage(context, extensionId);
    await optionsPage.locator("#timeout").fill("12");
    await expect(optionsPage.locator("#timeout-status")).toHaveText("Saved.");

    await expect.poll(async () => countCloseAlarms(serviceWorker)).toBe(before);
});
