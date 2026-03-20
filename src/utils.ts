export const SUPPORTED_PROTOCOLS: ReadonlySet<string> = new Set([
  "http:",
  "https:",
]);

export const STORAGE_KEY_ANCHORED = "anchoredTabs";
export const STORAGE_KEY_TIMEOUT = "timeoutMinutes";
export const STORAGE_KEY_EXCLUDED_DOMAINS = "excludedDomains";
export const DEFAULT_TIMEOUT_MINUTES = 10;
export const MAX_TIMEOUT_MINUTES = 1440;

export const ALARM_PREFIX = "close-tab-";

const DEBUG_PREFIX = "[Flotsam]";

export function alarmName(tabId: number): string {
  return `${ALARM_PREFIX}${tabId}`;
}

export function tabIdFromAlarm(name: string): number | null {
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

export function isManagedUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  try {
    return SUPPORTED_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function logDebug(message: string, details?: unknown): void {
  if (details === undefined) {
    console.debug(DEBUG_PREFIX, message);
    return;
  }
  console.debug(DEBUG_PREFIX, message, details);
}

export function logError(message: string, error: unknown): void {
  console.error(DEBUG_PREFIX, message, error);
}

export async function safeStorageGet(
  key: string,
): Promise<Record<string, unknown>> {
  try {
    const result = await chrome.storage.local.get(key);
    return result as Record<string, unknown>;
  } catch (error) {
    logError("storage.local.get failed", error);
    return {};
  }
}

export async function safeStorageSet(
  value: Record<string, unknown>,
): Promise<boolean> {
  try {
    await chrome.storage.local.set(value);
    return true;
  } catch (error) {
    logError("storage.local.set failed", error);
    return false;
  }
}

export async function getAnchoredTabs(): Promise<Set<number>> {
  const stored = await safeStorageGet(STORAGE_KEY_ANCHORED);
  const raw = stored[STORAGE_KEY_ANCHORED];
  if (Array.isArray(raw)) {
    return new Set(raw.filter((id): id is number => typeof id === "number"));
  }
  return new Set();
}

export async function persistAnchoredTabs(tabs: Set<number>): Promise<boolean> {
  return safeStorageSet({ [STORAGE_KEY_ANCHORED]: [...tabs] });
}

export async function getTimeoutMinutes(): Promise<number> {
  const stored = await safeStorageGet(STORAGE_KEY_TIMEOUT);
  const raw = stored[STORAGE_KEY_TIMEOUT];
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) {
    return Math.min(raw, MAX_TIMEOUT_MINUTES);
  }
  return DEFAULT_TIMEOUT_MINUTES;
}

export function extractDomain(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    const hostname = new URL(url).hostname;
    return hostname || null;
  } catch {
    return null;
  }
}

export function isDomainMatch(hostname: string, pattern: string): boolean {
  return hostname === pattern || hostname.endsWith("." + pattern);
}

export async function getExcludedDomains(): Promise<Set<string>> {
  const stored = await safeStorageGet(STORAGE_KEY_EXCLUDED_DOMAINS);
  const raw = stored[STORAGE_KEY_EXCLUDED_DOMAINS];
  if (Array.isArray(raw)) {
    return new Set(raw.filter((d): d is string => typeof d === "string"));
  }
  return new Set();
}

export async function persistExcludedDomains(
  domains: Set<string>,
): Promise<boolean> {
  return safeStorageSet({ [STORAGE_KEY_EXCLUDED_DOMAINS]: [...domains] });
}

/** Stable snapshot for comparing storage payloads (sorted JSON array of strings). */
export function excludedDomainsSnapshotFromStorageValue(raw: unknown): string {
  if (!Array.isArray(raw)) {
    return "[]";
  }
  const strings = raw.filter((d): d is string => typeof d === "string");
  return JSON.stringify([...strings].sort());
}
