import {
  alarmName,
  tabIdFromAlarm,
  isManagedUrl,
  extractDomain,
  isDomainMatch,
  getAnchoredTabs,
  persistAnchoredTabs,
  getTimeoutMinutes,
  getExcludedDomains,
  persistExcludedDomains,
  excludedDomainsSnapshotFromStorageValue,
  logDebug,
  logError,
} from "./utils";

const anchoredTabs = new Set<number>();
const excludedDomains = new Set<string>();
const activeTabByWindow = new Map<number, number>();
const recentlyReplaced = new Set<number>();
const pendingCleanupTimers = new Map<number, ReturnType<typeof setTimeout>>();

const CONTEXT_MENU_EXCLUDE_DOMAIN = "flotsam-exclude-domain";
const CONTEXT_MENU_ABOUT = "flotsam-about";
let contextMenuPromise: Promise<void> | null = null;

async function loadAnchoredTabs(): Promise<void> {
  const stored = await getAnchoredTabs();
  anchoredTabs.clear();
  for (const id of stored) {
    anchoredTabs.add(id);
  }
}

async function loadExcludedDomains(): Promise<void> {
  const stored = await getExcludedDomains();
  excludedDomains.clear();
  for (const d of stored) {
    excludedDomains.add(d);
  }
}

/** Echo snapshots for worker-initiated excludedDomains writes (FIFO). See storage.onChanged handler. */
const pendingExcludedDomainEchoes: string[] = [];

function applyExcludedDomainsFromStorageRaw(raw: unknown): void {
  excludedDomains.clear();
  if (!Array.isArray(raw)) {
    return;
  }
  for (const d of raw) {
    if (typeof d === "string") {
      excludedDomains.add(d);
    }
  }
}

/**
 * Persist excluded domains from the service worker and record the payload so we can ignore the
 * resulting storage.onChanged echo without clobbering newer in-memory state.
 */
async function persistExcludedDomainsFromWorker(
  domains: Set<string>,
): Promise<boolean> {
  const snapshot = excludedDomainsSnapshotFromStorageValue([...domains]);
  pendingExcludedDomainEchoes.push(snapshot);
  const ok = await persistExcludedDomains(domains);
  if (!ok) {
    const last = pendingExcludedDomainEchoes.at(-1);
    if (last === snapshot) {
      pendingExcludedDomainEchoes.pop();
    }
  }
  return ok;
}

async function loadActiveTabsByWindow(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ active: true });
    activeTabByWindow.clear();
    for (const tab of tabs) {
      if (typeof tab.id === "number" && typeof tab.windowId === "number") {
        activeTabByWindow.set(tab.windowId, tab.id);
      }
    }
  } catch {
    // Non-critical — map will be populated incrementally by onActivated
  }
}

let stateLoadPromise: Promise<void> | null = null;

async function ensureStateLoaded(): Promise<void> {
  if (stateLoadPromise === null) {
    stateLoadPromise = Promise.all([
      loadAnchoredTabs(),
      loadExcludedDomains(),
      loadActiveTabsByWindow(),
    ])
      .then(() => undefined)
      .catch((err) => {
        stateLoadPromise = null;
        throw err;
      });
  }
  await stateLoadPromise;
}

async function scheduleClose(tabId: number): Promise<void> {
  try {
    const minutes = await getTimeoutMinutes();
    await chrome.alarms.create(alarmName(tabId), { delayInMinutes: minutes });
    logDebug("Scheduled close", { tabId, minutes });
  } catch (error) {
    logError("Failed to schedule close", error);
  }
}

async function cancelClose(tabId: number): Promise<void> {
  try {
    await chrome.alarms.clear(alarmName(tabId));
  } catch (error) {
    logError("Failed to cancel close", error);
  }
}

function iconVariant(anchored: boolean): string {
  return anchored ? "anchored" : "floating";
}

async function updateActionState(tabId: number): Promise<void> {
  await ensureStateLoaded();
  const variant = iconVariant(anchoredTabs.has(tabId));
  const title = anchoredTabs.has(tabId)
    ? "Flotsam (anchored)"
    : "Flotsam (will auto-close)";

  try {
    await chrome.action.setIcon({
      tabId,
      path: {
        16: `icons/icon-${variant}-16.png`,
        24: `icons/icon-${variant}-24.png`,
        32: `icons/icon-${variant}-32.png`,
      },
    });
    await chrome.action.setTitle({ tabId, title });
  } catch (error) {
    logError("Failed to update action state", error);
  }
}

function isDomainExcludedSync(url?: string): boolean {
  const hostname = extractDomain(url);
  if (hostname === null) return false;
  for (const excluded of excludedDomains) {
    if (isDomainMatch(hostname, excluded)) return true;
  }
  return false;
}

function findExclusionFor(hostname: string): string | null {
  if (excludedDomains.has(hostname)) return hostname;
  for (const excluded of excludedDomains) {
    if (isDomainMatch(hostname, excluded)) return excluded;
  }
  return null;
}

async function handleTabSeen(
  tabId: number,
  url?: string,
  knownTab?: chrome.tabs.Tab,
): Promise<void> {
  await ensureStateLoaded();
  if (!isManagedUrl(url)) {
    await cancelClose(tabId);
    return;
  }

  if (anchoredTabs.has(tabId) || isDomainExcludedSync(url)) {
    await cancelClose(tabId);
    await updateActionState(tabId);
    return;
  }

  let tab: chrome.tabs.Tab;
  if (knownTab) {
    tab = knownTab;
  } else {
    try {
      tab = await chrome.tabs.get(tabId);
    } catch {
      return;
    }
  }

  if (tab.active || tab.audible || tab.pinned || tab.groupId !== -1) {
    await cancelClose(tabId);
    await updateActionState(tabId);
    return;
  }

  await scheduleClose(tabId);
  await updateActionState(tabId);
}

async function toggleAnchor(tab: chrome.tabs.Tab): Promise<void> {
  await ensureStateLoaded();
  if (typeof tab.id !== "number") {
    return;
  }

  if (!isManagedUrl(tab.url)) {
    return;
  }

  const tabId = tab.id;

  if (anchoredTabs.has(tabId)) {
    anchoredTabs.delete(tabId);
    logDebug("Unanchored tab", { tabId });
  } else {
    anchoredTabs.add(tabId);
    logDebug("Anchored tab", { tabId });
  }

  await persistAnchoredTabs(anchoredTabs);
  await handleTabSeen(tabId, tab.url);
}

async function cleanupTab(tabId: number): Promise<void> {
  await ensureStateLoaded();
  if (recentlyReplaced.has(tabId)) return;
  anchoredTabs.delete(tabId);
  await cancelClose(tabId);
  await persistAnchoredTabs(anchoredTabs);
}

const REPLACED_TAB_CLEANUP_DELAY_MS = 250;

function scheduleTabCleanup(tabId: number): void {
  const existing = pendingCleanupTimers.get(tabId);
  if (existing) clearTimeout(existing);

  // Delay cleanup slightly so onReplaced can cancel it regardless of event order.
  const timer = setTimeout(() => {
    pendingCleanupTimers.delete(tabId);
    void cleanupTab(tabId).catch((err) =>
      logError("Unhandled in cleanupTab (delayed)", err),
    );
  }, REPLACED_TAB_CLEANUP_DELAY_MS);
  pendingCleanupTimers.set(tabId, timer);
}

function cancelScheduledCleanup(tabId: number): void {
  const timer = pendingCleanupTimers.get(tabId);
  if (!timer) return;
  clearTimeout(timer);
  pendingCleanupTimers.delete(tabId);
}

const RECONCILE_BATCH_SIZE = 8;

async function reconcileAllTabs(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    const manageable = tabs.filter(
      (tab): tab is chrome.tabs.Tab & { id: number } =>
        typeof tab.id === "number",
    );
    for (let i = 0; i < manageable.length; i += RECONCILE_BATCH_SIZE) {
      await Promise.all(
        manageable
          .slice(i, i + RECONCILE_BATCH_SIZE)
          .map((tab) => handleTabSeen(tab.id, tab.url, tab)),
      );
    }
  } catch (error) {
    logError("Failed to reconcile tabs", error);
  }
}

async function setupContextMenu(): Promise<void> {
  try {
    await chrome.contextMenus.removeAll();
  } catch (error) {
    logError("Failed to remove context menus", error);
  }
  const reportCreateError = (): void => {
    if (chrome.runtime.lastError) {
      logError(
        "Failed to create context menu",
        chrome.runtime.lastError.message,
      );
    }
  };

  chrome.contextMenus.create(
    {
      id: CONTEXT_MENU_EXCLUDE_DOMAIN,
      title: "Never auto-close tabs from this domain",
      contexts: ["action"],
    },
    reportCreateError,
  );
  chrome.contextMenus.create(
    {
      id: CONTEXT_MENU_ABOUT,
      title: "About Flotsam",
      contexts: ["action"],
    },
    reportCreateError,
  );
}

async function ensureContextMenu(): Promise<void> {
  if (contextMenuPromise === null) {
    contextMenuPromise = setupContextMenu().catch((err) => {
      contextMenuPromise = null;
      throw err;
    });
  }
  await contextMenuPromise;
}

async function updateContextMenuForTab(tab: chrome.tabs.Tab): Promise<void> {
  await ensureStateLoaded();
  await ensureContextMenu();
  const domain = extractDomain(tab.url);

  try {
    if (!domain || !isManagedUrl(tab.url)) {
      await chrome.contextMenus.update(CONTEXT_MENU_EXCLUDE_DOMAIN, {
        title: "Never auto-close tabs from this domain",
        enabled: false,
      });
      return;
    }

    const exclusion = findExclusionFor(domain);
    await chrome.contextMenus.update(CONTEXT_MENU_EXCLUDE_DOMAIN, {
      title: exclusion
        ? `Resume auto-closing tabs from ${exclusion}`
        : `Never auto-close tabs from ${domain}`,
      enabled: true,
    });
  } catch (error) {
    logError("Failed to update context menu", error);
  }
}

async function toggleDomainExclusion(tab: chrome.tabs.Tab): Promise<void> {
  await ensureStateLoaded();
  const hostname = extractDomain(tab.url);
  if (!hostname) {
    return;
  }

  const existing = findExclusionFor(hostname);
  if (existing) {
    excludedDomains.delete(existing);
    logDebug("Removed domain exclusion", { domain: existing });
  } else {
    excludedDomains.add(hostname);
    logDebug("Added domain exclusion", { domain: hostname });
  }

  await persistExcludedDomainsFromWorker(excludedDomains);
  await reconcileAllTabs();
}

async function pruneStaleAnchoredTabs(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    const liveIds = new Set(
      tabs
        .map((t) => t.id)
        .filter((id): id is number => typeof id === "number"),
    );
    let pruned = false;
    for (const id of [...anchoredTabs]) {
      if (!liveIds.has(id)) {
        anchoredTabs.delete(id);
        pruned = true;
      }
    }
    if (pruned) {
      await persistAnchoredTabs(anchoredTabs);
      logDebug("Pruned stale anchored tab IDs");
    }
  } catch (error) {
    logError("Failed to prune stale anchored tabs", error);
  }
}

async function pruneStaleAlarms(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    const liveIds = new Set(
      tabs
        .map((t) => t.id)
        .filter((id): id is number => typeof id === "number"),
    );
    const alarms = await chrome.alarms.getAll();
    const stale = alarms.filter((alarm) => {
      const tabId = tabIdFromAlarm(alarm.name);
      return tabId !== null && !liveIds.has(tabId);
    });
    if (stale.length > 0) {
      await Promise.all(stale.map((alarm) => chrome.alarms.clear(alarm.name)));
      logDebug("Pruned stale alarms", { count: stale.length });
    }
  } catch (error) {
    logError("Failed to prune stale alarms", error);
  }
}

async function initialize(): Promise<void> {
  stateLoadPromise = null;
  contextMenuPromise = null;
  await ensureStateLoaded();
  await pruneStaleAnchoredTabs();
  await pruneStaleAlarms();
  await ensureContextMenu();
  await reconcileAllTabs();
}

chrome.runtime.onInstalled.addListener(() => {
  void initialize().catch((err) => logError("Unhandled in initialize", err));
});

chrome.runtime.onStartup.addListener(() => {
  void initialize().catch((err) => logError("Unhandled in initialize", err));
});

chrome.action.onClicked.addListener((tab) => {
  void toggleAnchor(tab).catch((err) =>
    logError("Unhandled in toggleAnchor", err),
  );
});

chrome.tabs.onCreated.addListener((tab) => {
  if (typeof tab.id === "number") {
    void handleTabSeen(tab.id, tab.url).catch((err) =>
      logError("Unhandled in handleTabSeen (onCreated)", err),
    );
  }
});

async function handleAudibleChange(
  tabId: number,
  audible: boolean,
  url?: string,
): Promise<void> {
  await ensureStateLoaded();
  if (anchoredTabs.has(tabId)) return;
  if (!isManagedUrl(url)) return;

  if (audible) {
    logDebug("Tab started playing audio, pausing auto-close", { tabId });
    await cancelClose(tabId);
  } else {
    logDebug("Tab stopped playing audio, re-evaluating", { tabId });
    await handleTabSeen(tabId, url);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.url) {
    void handleTabSeen(tabId, tab.url)
      .then(() => {
        if (tab.active) return updateContextMenuForTab(tab);
      })
      .catch((err) => logError("Unhandled in handleTabSeen (onUpdated)", err));
    return;
  }

  if (changeInfo.pinned !== undefined) {
    void handleTabSeen(tabId, tab.url).catch((err) =>
      logError("Unhandled in handleTabSeen (onUpdated/pinned)", err),
    );
    return;
  }

  if (changeInfo.groupId !== undefined) {
    void handleTabSeen(tabId, tab.url).catch((err) =>
      logError("Unhandled in handleTabSeen (onUpdated/groupId)", err),
    );
    return;
  }

  if (changeInfo.audible !== undefined) {
    void handleAudibleChange(tabId, changeInfo.audible, tab.url).catch((err) =>
      logError("Unhandled in handleAudibleChange", err),
    );
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ABOUT) {
    void chrome.tabs
      .create({ url: chrome.runtime.getURL("about.html") })
      .catch((err) => logError("Failed to open About page", err));
    return;
  }
  if (info.menuItemId === CONTEXT_MENU_EXCLUDE_DOMAIN && tab) {
    void toggleDomainExclusion(tab).catch((err) =>
      logError("Unhandled in toggleDomainExclusion", err),
    );
  }
});

async function handleTabActivated(
  tabId: number,
  windowId: number,
): Promise<void> {
  await ensureStateLoaded();

  const prevTabId = activeTabByWindow.get(windowId);
  activeTabByWindow.set(windowId, tabId);

  await cancelClose(tabId);
  await updateActionState(tabId);

  try {
    const tab = await chrome.tabs.get(tabId);
    await updateContextMenuForTab(tab);
  } catch {
    // Tab may have been removed between activation and query
  }

  if (prevTabId !== undefined && prevTabId !== tabId) {
    try {
      const prevTab = await chrome.tabs.get(prevTabId);
      if (typeof prevTab.id === "number") {
        await handleTabSeen(prevTab.id, prevTab.url);
      }
    } catch {
      // Previous tab may have been closed
    }
  }
}

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  void handleTabActivated(tabId, windowId).catch((err) =>
    logError("Unhandled in handleTabActivated", err),
  );
});

chrome.tabs.onRemoved.addListener((tabId) => {
  scheduleTabCleanup(tabId);
});

chrome.windows.onRemoved.addListener((windowId) => {
  activeTabByWindow.delete(windowId);
});

async function handleTabReplaced(
  addedTabId: number,
  removedTabId: number,
): Promise<void> {
  await ensureStateLoaded();

  const wasAnchored = anchoredTabs.has(removedTabId);
  if (wasAnchored) {
    anchoredTabs.delete(removedTabId);
    anchoredTabs.add(addedTabId);
    await persistAnchoredTabs(anchoredTabs);
    logDebug("Transferred anchor to replaced tab", {
      removedTabId,
      addedTabId,
    });
  }

  for (const [windowId, tabId] of activeTabByWindow) {
    if (tabId === removedTabId) {
      activeTabByWindow.set(windowId, addedTabId);
      break;
    }
  }

  await cancelClose(removedTabId);

  try {
    const tab = await chrome.tabs.get(addedTabId);
    await handleTabSeen(addedTabId, tab.url);
  } catch {
    // Replacement tab was closed before we could query it — nothing to manage
  }
}

chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
  recentlyReplaced.add(removedTabId);
  cancelScheduledCleanup(removedTabId);
  void handleTabReplaced(addedTabId, removedTabId)
    .finally(() => recentlyReplaced.delete(removedTabId))
    .catch((err) => logError("Unhandled in handleTabReplaced", err));
});

let reconcileTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleReconcile(): void {
  if (reconcileTimer !== null) clearTimeout(reconcileTimer);
  reconcileTimer = setTimeout(() => {
    reconcileTimer = null;
    void reconcileAllTabs().catch((err) =>
      logError("Unhandled in debounced reconcile", err),
    );
  }, 200);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  const needsReconcile =
    changes.anchoredTabs || changes.excludedDomains || changes.timeoutMinutes;
  if (!needsReconcile) return;

  void ensureStateLoaded()
    .then(() => {
      // anchoredTabs is only written by this worker — reloading from storage here can race with
      // newer in-memory mutations before the next persist completes. In-memory set stays canonical.
      if (changes.excludedDomains) {
        const raw = changes.excludedDomains.newValue;
        const incomingSnap = excludedDomainsSnapshotFromStorageValue(raw);
        if (
          pendingExcludedDomainEchoes.length > 0 &&
          pendingExcludedDomainEchoes[0] === incomingSnap
        ) {
          pendingExcludedDomainEchoes.shift();
        } else {
          // Options page or another context changed the list — apply payload from the event.
          applyExcludedDomainsFromStorageRaw(raw);
        }
      }
      scheduleReconcile();
    })
    .catch((err) => logError("Unhandled in onChanged reconcile", err));
});

async function handleAlarm(tabId: number): Promise<void> {
  await ensureStateLoaded();

  if (anchoredTabs.has(tabId)) return;

  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    // Tab was closed before the alarm fired — nothing to close
    return;
  }

  if (!isManagedUrl(tab.url)) return;

  if (tab.pinned) {
    logDebug("Tab is pinned, skipping auto-close", { tabId });
    return;
  }

  if (tab.groupId !== -1) {
    logDebug("Tab is grouped, skipping auto-close", { tabId });
    return;
  }

  if (isDomainExcludedSync(tab.url)) {
    logDebug("Domain is excluded, skipping auto-close", { tabId });
    return;
  }

  if (tab.active) {
    logDebug("Tab is active, rescheduling instead of closing", { tabId });
    await scheduleClose(tabId);
    return;
  }

  if (tab.audible) {
    logDebug("Tab is audible, rescheduling instead of closing", { tabId });
    await scheduleClose(tabId);
    return;
  }

  logDebug("Auto-closing tab", { tabId });
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    logError("Failed to remove tab", error);
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  const tabId = tabIdFromAlarm(alarm.name);
  if (tabId === null) return;
  void handleAlarm(tabId).catch((err) =>
    logError("Unhandled in handleAlarm", err),
  );
});
