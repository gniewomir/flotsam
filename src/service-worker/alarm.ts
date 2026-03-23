import { logDebug, logError } from "../log";
import { queue, queueStateful } from "./state";
import { isManagedUrl } from "./utility";
import { extractDomain } from "../utility";
import { Configuration } from "../configuration";
import { TAB_GROUP_ID_NONE, tabEligibleToBeClosed } from "./tab-eligibility";

export const ALARM_PREFIX = "close-tab-";

export function alarmName(tabId: number): string {
    return `${ALARM_PREFIX}${tabId}`;
}

export async function scheduleTabAlarm(
    tabId: number | undefined,
    timeoutMinutes: number,
    anchoredTabs: Set<number>,
): Promise<void> {
    try {
        if (typeof tabId !== "number") return;
        if (tabId === chrome.tabs.TAB_ID_NONE) return;

        const tab = await chrome.tabs.get(tabId);

        if (!tabEligibleToBeClosed(tab, anchoredTabs)) return;

        await chrome.alarms.create(alarmName(tabId), {
            delayInMinutes: timeoutMinutes,
        });
        logDebug("Scheduled alarm", { tabId, timeoutMinutes });
    } catch (error) {
        logError("Failed to schedule alarm", error);
    }
}

export async function cancelTabAlarm(tabId: number | undefined): Promise<void> {
    try {
        if (typeof tabId !== "number") return;
        if (tabId === chrome.tabs.TAB_ID_NONE) return;

        await chrome.alarms.clear(alarmName(tabId));
        logDebug("Canceled alarm", { tabId });
    } catch (error) {
        logError("Failed to cancel alarm", error);
    }
}

export async function rescheduleAll(
    timeoutMinutes: number,
    anchoredTabs: Set<number>,
) {
    await chrome.alarms.clearAll();
    await Promise.allSettled(
        (await chrome.tabs.query({})).map((tab) => {
            return scheduleTabAlarm(tab.id, timeoutMinutes, anchoredTabs);
        }),
    );
}

function tabIdFromAlarm(name: string): number | null {
    if (!name.startsWith(ALARM_PREFIX)) {
        return null;
    }
    const suffix = name.slice(ALARM_PREFIX.length);
    if (!suffix || suffix !== suffix.trim()) {
        return null;
    }
    const id = Number(suffix);
    return Number.isInteger(id) && id >= 0 ? id : null;
}

async function removeTab(tabId: number) {
    try {
        await chrome.tabs.remove(tabId);
    } catch (error) {
        logError("Failed to remove tab", error);
    }
}

chrome.alarms.onAlarm.addListener((alarm) => {
    queueStateful("chrome.alarms.onAlarm", async (state) => {
        const tabId = tabIdFromAlarm(alarm.name);

        if (tabId === null) return {};
        if (state.anchoredTabs.has(tabId)) return {};

        let tab: chrome.tabs.Tab;
        try {
            tab = await chrome.tabs.get(tabId);
        } catch (error) {
            logDebug("Tab was probably closed already", { tabId, error });
            return {};
        }

        if (!isManagedUrl(tab.url)) return {};

        const tabDomain = extractDomain(tab.url);
        if (tabDomain === null) return {};

        for (const excludedDomain of state.excludedDomains.values()) {
            if (
                tabDomain === excludedDomain ||
                tabDomain.endsWith(`.${excludedDomain}`)
            )
                return {};
        }

        if (tab.pinned) {
            await scheduleTabAlarm(
                tabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            );
            return {};
        }

        if (tab.groupId !== TAB_GROUP_ID_NONE) {
            await scheduleTabAlarm(
                tabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            );
            return {};
        }

        if (tab.active === true) {
            await scheduleTabAlarm(
                tabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            );
            return {};
        }

        if (tab.audible === true) {
            await scheduleTabAlarm(
                tabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            );
            return {};
        }

        await removeTab(tabId);

        return {};
    });
});

chrome.tabs.onCreated.addListener((tab) => {
    queueStateful("chrome.tabs.onCreated - alarms", async (state) => {
        await scheduleTabAlarm(
            tab.id,
            state.timeoutMinutes,
            state.anchoredTabs,
        );
        return {};
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    queueStateful("chrome.tabs.onUpdated - alarms", async (state) => {
        if (changeInfo.url) {
            await scheduleTabAlarm(
                tabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            );
        }
        if (changeInfo.pinned === false) {
            await scheduleTabAlarm(
                tabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            );
        }
        if (changeInfo.groupId === TAB_GROUP_ID_NONE) {
            await scheduleTabAlarm(
                tabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            );
        }
        if (changeInfo.audible === false) {
            await scheduleTabAlarm(
                tabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            );
        }
        return {};
    });
});

chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
    queueStateful("chrome.tabs.onReplaced - alarms", async (state) => {
        // pass anchored status to the replacing tab
        if (state.anchoredTabs.has(removedTabId)) {
            state.anchoredTabs.delete(removedTabId);
            state.anchoredTabs.add(addedTabId);
        }
        // reschedule replaced tab ( preloading, pre-rendering)
        await Promise.allSettled([
            cancelTabAlarm(removedTabId),
            scheduleTabAlarm(
                addedTabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            ),
        ]);

        return {
            anchoredTabs: state.anchoredTabs,
        };
    });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    queueStateful("chrome.tabs.onActivated - alarms", async (state) => {
        const previousTabId = state.activeTabByWindow.get(activeInfo.windowId);
        state.activeTabByWindow.set(activeInfo.windowId, activeInfo.tabId);
        await Promise.allSettled([
            scheduleTabAlarm(
                activeInfo.tabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            ),
            scheduleTabAlarm(
                previousTabId,
                state.timeoutMinutes,
                state.anchoredTabs,
            ),
        ]);
        return {
            activeTabByWindow: state.activeTabByWindow,
        };
    });
});

chrome.tabs.onDetached.addListener((tabId) => {
    void cancelTabAlarm(tabId);
});

chrome.tabs.onAttached.addListener((tabId) => {
    queueStateful("chrome.tabs.onAttached - alarms", async (state) => {
        await scheduleTabAlarm(tabId, state.timeoutMinutes, state.anchoredTabs);
        return {};
    });
});

chrome.tabs.onRemoved.addListener((tabId) => {
    queue("chrome.tabs.onRemoved - alarms", async () => {
        await cancelTabAlarm(tabId);
    });
});

chrome.storage.sync.onChanged.addListener((changeInfo) => {
    queueStateful("chrome.storage.sync.onChanged - alarms", async (state) => {
        /**
         * note: if timeout changed reschedule all alarms with a new setting,
         *       state is updated before updating storage, so we can depend on it,
         *       instead looking at the change info
         */
        if (("timeoutMinutes" satisfies keyof Configuration) in changeInfo) {
            await rescheduleAll(state.timeoutMinutes, state.anchoredTabs);
        }
        return {};
    });
});
