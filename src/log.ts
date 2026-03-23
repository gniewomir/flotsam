import { State } from "./service-worker/state";

const PREFIX = "[Flotsam]";

let installType = chrome.management.ExtensionInstallType.DEVELOPMENT;

/**
 * Per chrome documentation: 'getSelf' does not require 'management' permission
 * ref: https://developer.chrome.com/docs/extensions/reference/api/management?hl=pl
 */
chrome.management
  .getSelf()
  .then((extensionInfo) => {
    installType =
      extensionInfo.installType as chrome.management.ExtensionInstallType;
  })
  .catch((err) => {
    logError("Could not load extension info", err);
  });

export function logState(message: string, before: State, after: State): void {
  logDebug(message, {
    before,
    after,
  });
}

export function logDebug(message: string, details?: unknown): void {
  if (installType !== chrome.management.ExtensionInstallType.DEVELOPMENT) {
    return;
  }
  if (details === undefined) {
    console.debug(PREFIX, message);
    return;
  }
  console.debug(PREFIX, message, details);
}

export function logError(message: string, error: unknown): void {
  console.error(PREFIX, message, error);
}
