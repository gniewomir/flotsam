import { describe, expect, it } from "vitest";
import { defaultConfiguration } from "../configuration";
import type { State } from "./state";
import { defaultSession } from "./session";

import { excludeDomain } from "./extension";
import { EXCLUDE_DOMAIN_CONTEXT_MENU_TITLE_MANAGED } from "./extension";

function minimalState(): State {
  return {
    ...defaultConfiguration,
    ...defaultSession,
    activeTabByWindow: new Map(),
    excludedDomains: new Set<string>(),
  };
}

describe("context menu copy", () => {
  it("matches options page wording", () => {
    expect(EXCLUDE_DOMAIN_CONTEXT_MENU_TITLE_MANAGED).toBe(
      "Exclude tab domain",
    );
  });
});

describe("excludeDomainFromManagedUrl", () => {
  it("adds hostname for https URLs", () => {
    const state = minimalState();
    const partial = excludeDomain(state, "https://example.com/p");
    expect(partial.excludedDomains?.has("example.com")).toBe(true);
  });

  it("returns empty for non-managed URLs", () => {
    const state = minimalState();
    expect(excludeDomain(state, "about:blank")).toEqual({});
  });
});
