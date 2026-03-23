import { describe, expect, it } from "vitest";
import { defaultConfiguration } from "../configuration";
import type { State } from "./state";
import { defaultSession } from "./session";
import { excludeDomainFromManagedUrl } from "./extension-actions";

function minimalState(): State {
  return {
    ...defaultConfiguration,
    ...defaultSession,
    activeTabByWindow: new Map(),
    excludedDomains: new Set<string>(),
  };
}

describe("excludeDomainFromManagedUrl", () => {
  it("adds hostname for https URLs", () => {
    const state = minimalState();
    const partial = excludeDomainFromManagedUrl(state, "https://example.com/p");
    expect(partial.excludedDomains?.has("example.com")).toBe(true);
  });

  it("returns empty for non-managed URLs", () => {
    const state = minimalState();
    expect(excludeDomainFromManagedUrl(state, "about:blank")).toEqual({});
  });
});
