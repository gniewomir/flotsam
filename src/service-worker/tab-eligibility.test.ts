import { describe, expect, it } from "vitest";
import {
  TAB_GROUP_ID_NONE,
  tabAllowsCloseAlarmScheduling,
} from "./tab-eligibility";

describe("tabAllowsCloseAlarmScheduling", () => {
  const base = {
    pinned: false,
    groupId: TAB_GROUP_ID_NONE,
    audible: false,
    url: "https://example.com/",
  };

  it("allows a normal https tab", () => {
    expect(tabAllowsCloseAlarmScheduling(base)).toBe(true);
  });

  it("rejects pinned tabs", () => {
    expect(tabAllowsCloseAlarmScheduling({ ...base, pinned: true })).toBe(
      false,
    );
  });

  it("rejects grouped tabs", () => {
    expect(tabAllowsCloseAlarmScheduling({ ...base, groupId: 1 })).toBe(
      false,
    );
  });

  it("rejects audible tabs", () => {
    expect(tabAllowsCloseAlarmScheduling({ ...base, audible: true })).toBe(
      false,
    );
  });

  it("rejects non-managed URLs", () => {
    expect(
      tabAllowsCloseAlarmScheduling({ ...base, url: "chrome://version/" }),
    ).toBe(false);
  });

  it("treats muted / non-playing as not audible (audible false)", () => {
    expect(tabAllowsCloseAlarmScheduling({ ...base, audible: false })).toBe(
      true,
    );
  });
});
