import { describe, expect, it } from "vitest";
import { EXCLUDE_DOMAIN_CONTEXT_MENU_TITLE_MANAGED } from "./extension-constants";

describe("context menu copy", () => {
  it("matches options page wording", () => {
    expect(EXCLUDE_DOMAIN_CONTEXT_MENU_TITLE_MANAGED).toBe("Exclude tab domain");
  });
});
