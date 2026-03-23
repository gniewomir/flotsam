import { queueStateful } from "./state";
import { toggleAnchorForManagedTab } from "./anchor-actions";

chrome.action.onClicked.addListener((tab) => {
  queueStateful("chrome.action.onClicked", (state) =>
    toggleAnchorForManagedTab(state, tab),
  );
});
