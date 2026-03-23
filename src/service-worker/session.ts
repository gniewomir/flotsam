export type Session = {
  anchoredTabs: Set<number>;
};
export const defaultSession: Session = {
  anchoredTabs: new Set<number>([]),
};

export type SessionStorage = {
  anchoredTabs: number[];
};

export async function updateSession(
  sessionChanges: Partial<Session>,
): Promise<void> {
  const update: Partial<SessionStorage> = {};

  const anchoredTabsKey = "anchoredTabs" satisfies keyof Session &
    keyof SessionStorage;
  if (
    anchoredTabsKey in sessionChanges &&
    sessionChanges[anchoredTabsKey] !== undefined
  ) {
    update[anchoredTabsKey] = Array.from(sessionChanges[anchoredTabsKey]);
  }

  if (Object.keys(update).length === 0) {
    return;
  }
  await chrome.storage.session.set(update);
}

export async function loadSession(): Promise<Session> {
  const rawSession = await chrome.storage.session.get(null);
  const rawAnchoredTabs = Array.isArray(rawSession.anchoredTabs)
    ? rawSession.anchoredTabs
    : [];
  const anchoredTabs = new Set<number>(
    rawAnchoredTabs.filter((id): id is number => typeof id === "number"),
  );
  return {
    anchoredTabs,
  };
}
