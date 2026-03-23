import { logError } from "../log";
import { queueStateful } from "./state";
import { isManagedUrl } from "./utility";
import { cancelTabAlarm, scheduleTabAlarm } from "./alarm";

chrome.action.onClicked.addListener((tab) => {
  queueStateful("chrome.action.onClicked", async (state) => {
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
    const title = isAnchored
      ? "Flotsam (anchored)"
      : "Flotsam (will auto-close)";

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
  });
});
