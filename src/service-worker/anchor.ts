import { queueStateful, type State } from "./state";
import { isManagedUrl } from "./utility";
import { cancelTabAlarm, scheduleTabAlarm } from "./alarm";
import { logError } from "../log";

/**
 * Toggle anchor for a managed HTTP(S) tab; updates icon/title and alarms. Mutates
 * `state.anchoredTabs` on the cloned state object passed from `queueStateful`.
 */
export async function toggleAnchorForManagedTab(
    state: State,
    tab: Pick<chrome.tabs.Tab, "id" | "url">,
): Promise<Partial<State>> {
    if (typeof tab.id !== "number") {
        return {};
    }

    if (!isManagedUrl(tab.url)) {
        return {};
    }

    const tabId = tab.id;

    if (state.anchoredTabs.has(tabId)) {
        state.anchoredTabs.delete(tabId);
    } else {
        state.anchoredTabs.add(tabId);
    }
    const isAnchored = state.anchoredTabs.has(tabId);
    const variant = isAnchored ? "anchored" : "floating";
    const title = isAnchored ? "Flotsam (anchored)" : "Flotsam (will auto-close)";

    try {
        await Promise.all([
            isAnchored
                ? cancelTabAlarm(tabId)
                : scheduleTabAlarm(tabId, state.timeoutMinutes, state.anchoredTabs),
            chrome.action.setIcon({
                tabId,
                path: {
                    16: `../icons/icon-${variant}-16.png`,
                    24: `../icons/icon-${variant}-24.png`,
                    32: `../icons/icon-${variant}-32.png`,
                },
            }),
            chrome.action.setTitle({ tabId, title }),
        ]);
        return {
            anchoredTabs: state.anchoredTabs,
        };
    } catch (error) {
        logError("Failed to update action state", error);
        return {
            anchoredTabs: state.anchoredTabs,
        };
    }
}

chrome.action.onClicked.addListener((tab) => {
    queueStateful("chrome.action.onClicked", (state) => toggleAnchorForManagedTab(state, tab));
});
