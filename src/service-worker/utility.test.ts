import { describe, expect, it } from "vitest";
import { isManagedUrl } from "./utility";

describe("isManagedUrl", () => {
  it("accepts http and https", () => {
    expect(isManagedUrl("https://example.com/path")).toBe(true);
    expect(isManagedUrl("http://example.com/")).toBe(true);
  });

  it("rejects non-web schemes", () => {
    expect(isManagedUrl("about:blank")).toBe(false);
    expect(isManagedUrl("chrome://version/")).toBe(false);
    expect(isManagedUrl("file:///tmp/x")).toBe(false);
  });

  it("rejects missing or invalid URLs", () => {
    expect(isManagedUrl(undefined)).toBe(false);
    expect(isManagedUrl("not a url")).toBe(false);
  });
});
