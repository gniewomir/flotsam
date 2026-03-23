import { isManagedUrl } from "./utility";

/**
 * Mirrors `chrome.tabGroups.TAB_GROUP_ID_NONE` without requiring the tabGroups permission.
 */
export const TAB_GROUP_ID_NONE = -1;

/**
 * Whether a tab may receive a close alarm after `chrome.tabs.get` (anchoring and tab id
 * checks are applied earlier in `scheduleTabAlarm`).
 */
export function tabAllowsCloseAlarmScheduling(
  tab: Pick<chrome.tabs.Tab, "pinned" | "groupId" | "audible" | "url">,
): boolean {
  if (tab.pinned === true) return false;
  if (tab.groupId !== TAB_GROUP_ID_NONE) return false;
  if (tab.audible === true) return false;
  if (!isManagedUrl(tab.url)) return false;
  return true;
}
