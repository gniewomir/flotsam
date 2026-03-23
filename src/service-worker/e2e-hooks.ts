import { queueStatefulAsync } from "./state";
import { toggleAnchorForManagedTab } from "./anchor-actions";
import { excludeDomainFromManagedUrl } from "./extension-actions";
import { isManagedUrl } from "./utility";

type E2eMessage =
  | { type: "e2e-toggle-anchor"; tabId: number }
  | { type: "e2e-exclude-domain"; tabId: number };

async function waitForTabLoad(tabId: number): Promise<chrome.tabs.Tab> {
  for (let i = 0; i < 50; i++) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.url && tab.status === "complete" && isManagedUrl(tab.url)) {
      return tab;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return chrome.tabs.get(tabId);
}

if (FLOTSAM_E2E) {
  chrome.runtime.onMessage.addListener(
    (
      message: E2eMessage,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: { ok: boolean }) => void,
    ): boolean => {
      if (message?.type === "e2e-toggle-anchor") {
        void queueStatefulAsync("e2e-toggle-anchor", async (state) => {
          const tab = await chrome.tabs.get(message.tabId);
          return toggleAnchorForManagedTab(state, tab);
        }).then(() => sendResponse({ ok: true }));
        return true;
      }
      if (message?.type === "e2e-exclude-domain") {
        void queueStatefulAsync("e2e-exclude-domain", async (state) => {
          const tab = await waitForTabLoad(message.tabId);
          return excludeDomainFromManagedUrl(state, tab.url);
        }).then(() => sendResponse({ ok: true }));
        return true;
      }
      return false;
    },
  );
}
