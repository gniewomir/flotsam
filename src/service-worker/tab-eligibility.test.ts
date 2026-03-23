import { describe, expect, it } from "vitest";
import { TAB_GROUP_ID_NONE, tabEligibleToBeClosed } from "./tab-eligibility";

describe("tabAllowsCloseAlarmScheduling", () => {
    const base: Pick<chrome.tabs.Tab, "url" | "pinned" | "id" | "audible" | "groupId"> = {
        id: 44,
        pinned: false,
        groupId: TAB_GROUP_ID_NONE,
        audible: false,
        url: "https://example.com/",
    };

    it("allows a normal https tab", () => {
        expect(tabEligibleToBeClosed(base, new Set<number>())).toBe(true);
    });

    it("rejects anchored tabs", () => {
        expect(tabEligibleToBeClosed(base, new Set<number>([base.id || 0]))).toBe(false);
    });

    it("rejects pinned tabs", () => {
        expect(tabEligibleToBeClosed({ ...base, pinned: true }, new Set<number>())).toBe(false);
    });

    it("rejects grouped tabs", () => {
        expect(tabEligibleToBeClosed({ ...base, groupId: 1 }, new Set<number>())).toBe(false);
    });

    it("rejects audible tabs", () => {
        expect(tabEligibleToBeClosed({ ...base, audible: true }, new Set<number>())).toBe(false);
    });

    it("rejects non-managed URLs", () => {
        expect(
            tabEligibleToBeClosed({ ...base, url: "chrome://version/" }, new Set<number>()),
        ).toBe(false);
    });

    it("treats muted / non-playing as not audible (audible false)", () => {
        expect(tabEligibleToBeClosed({ ...base, audible: false }, new Set<number>())).toBe(true);
    });
});
