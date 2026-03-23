import { isManagedUrl } from "./utility";

/**
 * Mirrors `chrome.tabGroups.TAB_GROUP_ID_NONE` without requiring the tabGroups permission.
 */
export const TAB_GROUP_ID_NONE = -1;

export function tabEligibleToBeClosed(
    tab: Pick<chrome.tabs.Tab, "pinned" | "groupId" | "audible" | "url" | "id">,
    anchoredTabs: Set<number>,
): boolean {
    if (!tab.id || anchoredTabs.has(tab.id)) return false;
    if (tab.pinned === true) return false;
    if (tab.groupId !== TAB_GROUP_ID_NONE) return false;
    if (tab.audible === true) return false;
    if (!isManagedUrl(tab.url)) return false;
    return true;
}
