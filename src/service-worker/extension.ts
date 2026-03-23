import { logError } from "../log";
import { queue, queueStateful } from "./state";
import { rescheduleAll } from "./alarm";
import { excludeDomainFromManagedUrl } from "./extension-actions";
import {
  EXCLUDE_DOMAIN_CONTEXT_MENU_ID,
  EXCLUDE_DOMAIN_CONTEXT_MENU_TITLE_MANAGED,
} from "./extension-constants";

export {
  EXCLUDE_DOMAIN_CONTEXT_MENU_ID,
  EXCLUDE_DOMAIN_CONTEXT_MENU_TITLE_MANAGED,
} from "./extension-constants";

async function registerContextmenu() {
  await chrome.contextMenus.removeAll();
  await new Promise<void>((resolve, reject) => {
    chrome.contextMenus.create(
      {
        id: EXCLUDE_DOMAIN_CONTEXT_MENU_ID,
        title: EXCLUDE_DOMAIN_CONTEXT_MENU_TITLE_MANAGED,
        type: "normal",
        documentUrlPatterns: ["http://*/*", "https://*/*"],
        contexts: ["action"],
      } satisfies chrome.contextMenus.CreateProperties,
      () => {
        if (chrome.runtime.lastError) {
          logError(
            "Failed to create context menu",
            chrome.runtime.lastError.message,
          );
          reject(chrome.runtime.lastError);
        }
        resolve();
      },
    );
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  queueStateful("chrome.runtime.onInstalled", async (state) => {
    if (details.reason === "install") {
      void chrome.runtime.openOptionsPage();
    }
    await Promise.all([
      rescheduleAll(state.timeoutMinutes, state.anchoredTabs),
      registerContextmenu(),
    ]);
    return {};
  });
});

chrome.runtime.onStartup.addListener(() => {
  queueStateful("chrome.runtime.onStartup", async (state) => {
    await Promise.all([
      rescheduleAll(state.timeoutMinutes, state.anchoredTabs),
      registerContextmenu(),
    ]);
    return {};
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  queueStateful(
    "chrome.contextMenus.onClicked - exclude domain",
    async (state) => {
      if (info.menuItemId !== EXCLUDE_DOMAIN_CONTEXT_MENU_ID) return {};

      return excludeDomainFromManagedUrl(state, tab?.url);
    },
  );
  queue("chrome.contextMenus.onClicked", async () => {
    await chrome.runtime.openOptionsPage();
  });
});
