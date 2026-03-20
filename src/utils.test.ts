import { describe, expect, test } from "vitest";
import {
  alarmName,
  tabIdFromAlarm,
  isManagedUrl,
  extractDomain,
  isDomainMatch,
  excludedDomainsSnapshotFromStorageValue,
  ALARM_PREFIX,
} from "./utils";

describe("alarmName", () => {
  test("produces a prefixed name from a tab id", () => {
    expect(alarmName(42)).toBe(`${ALARM_PREFIX}42`);
  });

  test("handles zero", () => {
    expect(alarmName(0)).toBe(`${ALARM_PREFIX}0`);
  });
});

describe("tabIdFromAlarm", () => {
  test("extracts tab id from a valid alarm name", () => {
    expect(tabIdFromAlarm(`${ALARM_PREFIX}42`)).toBe(42);
  });

  test("returns null for names without the prefix", () => {
    expect(tabIdFromAlarm("some-other-alarm")).toBeNull();
  });

  test("returns null for empty suffix", () => {
    expect(tabIdFromAlarm(ALARM_PREFIX)).toBeNull();
  });

  test("returns null for non-numeric suffix", () => {
    expect(tabIdFromAlarm(`${ALARM_PREFIX}abc`)).toBeNull();
  });

  test("handles zero", () => {
    expect(tabIdFromAlarm(`${ALARM_PREFIX}0`)).toBe(0);
  });
});

describe("isManagedUrl", () => {
  test("accepts http URLs", () => {
    expect(isManagedUrl("http://example.com")).toBe(true);
  });

  test("accepts https URLs", () => {
    expect(isManagedUrl("https://example.com/page")).toBe(true);
  });

  test("rejects chrome:// URLs", () => {
    expect(isManagedUrl("chrome://extensions")).toBe(false);
  });

  test("rejects chrome-extension:// URLs", () => {
    expect(isManagedUrl("chrome-extension://abc/page.html")).toBe(false);
  });

  test("rejects about: URLs", () => {
    expect(isManagedUrl("about:blank")).toBe(false);
  });

  test("rejects ftp: URLs", () => {
    expect(isManagedUrl("ftp://files.example.com")).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(isManagedUrl(undefined)).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isManagedUrl("")).toBe(false);
  });

  test("returns false for malformed input", () => {
    expect(isManagedUrl("not a url at all")).toBe(false);
  });
});

describe("extractDomain", () => {
  test("extracts hostname from https URL", () => {
    expect(extractDomain("https://example.com/page?q=1")).toBe("example.com");
  });

  test("extracts hostname from http URL", () => {
    expect(extractDomain("http://sub.example.com:8080/path")).toBe(
      "sub.example.com",
    );
  });

  test("returns null for undefined", () => {
    expect(extractDomain(undefined)).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(extractDomain("")).toBeNull();
  });

  test("returns null for malformed input", () => {
    expect(extractDomain("not a url")).toBeNull();
  });
});

describe("isDomainMatch", () => {
  test("exact match", () => {
    expect(isDomainMatch("example.com", "example.com")).toBe(true);
  });

  test("subdomain matches parent pattern", () => {
    expect(isDomainMatch("www.example.com", "example.com")).toBe(true);
  });

  test("deep subdomain matches parent pattern", () => {
    expect(isDomainMatch("a.b.example.com", "example.com")).toBe(true);
  });

  test("parent does not match subdomain pattern", () => {
    expect(isDomainMatch("example.com", "www.example.com")).toBe(false);
  });

  test("rejects partial suffix overlap", () => {
    expect(isDomainMatch("notexample.com", "example.com")).toBe(false);
  });

  test("rejects unrelated domain", () => {
    expect(isDomainMatch("other.org", "example.com")).toBe(false);
  });
});

describe("excludedDomainsSnapshotFromStorageValue", () => {
  test("sorts domains for stable comparison", () => {
    expect(excludedDomainsSnapshotFromStorageValue(["b.com", "a.com"])).toBe(
      excludedDomainsSnapshotFromStorageValue(["a.com", "b.com"]),
    );
  });

  test("filters non-strings", () => {
    expect(
      excludedDomainsSnapshotFromStorageValue(["a.com", 1, null, "b.com"]),
    ).toBe(excludedDomainsSnapshotFromStorageValue(["a.com", "b.com"]));
  });

  test("non-array becomes empty snapshot", () => {
    expect(excludedDomainsSnapshotFromStorageValue(undefined)).toBe("[]");
    expect(excludedDomainsSnapshotFromStorageValue({})).toBe("[]");
  });
});
