import { isManagedUrl } from "./utility";

/**
 * Mirrors `chrome.tabGroups.TAB_GROUP_ID_NONE` without requiring the tabGroups permission.
 */
export const TAB_GROUP_ID_NONE = -1;

/**
 * Product Audible: Chrome reports recent sound and the tab is not muted.
 * Chrome can keep `audible === true` while muted; muted tabs are not Audible.
 */
export function isAudible(tab: Pick<chrome.tabs.Tab, "audible" | "mutedInfo">): boolean {
    return tab.audible === true && tab.mutedInfo?.muted !== true;
}

export function tabEligibleToBeClosed(
    tab: Pick<chrome.tabs.Tab, "pinned" | "groupId" | "audible" | "mutedInfo" | "url" | "id">,
    anchoredTabs: Set<number>,
): boolean {
    if (!tab.id || anchoredTabs.has(tab.id)) return false;
    if (tab.pinned === true) return false;
    if (tab.groupId !== TAB_GROUP_ID_NONE) return false;
    if (isAudible(tab)) return false;
    if (!isManagedUrl(tab.url)) return false;
    return true;
}
