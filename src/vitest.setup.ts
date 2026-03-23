import { vi } from "vitest";

/** Resolve ESM build; package `main` is CJS and breaks Vitest's import path. */
import { chrome } from "vitest-chrome/lib/index.esm.js";

Object.assign(globalThis, { chrome });

/** Present on the real API; omitted from vitest-chrome's lazy schema. */
const ExtensionInstallType = {
    ADMIN: "admin",
    DEVELOPMENT: "development",
    NORMAL: "normal",
    SIDELOAD: "sideload",
    OTHER: "other",
} as const;

Object.assign(chrome.management, { ExtensionInstallType });

chrome.management.getSelf.mockImplementation(() =>
    Promise.resolve({
        id: "test-extension",
        installType: ExtensionInstallType.DEVELOPMENT,
        name: "Flotsam",
        version: "0.0.0",
        mayDisable: true,
        enabled: true,
        type: "extension",
    } as chrome.management.ExtensionInfo),
);

chrome.storage.sync.get.mockImplementation(() => Promise.resolve({}));

const storageAreaEvent = {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(() => false),
    hasListeners: vi.fn(() => false),
};
Object.assign(chrome.storage.sync, { onChanged: storageAreaEvent });

/** MV3 `storage.session`; not in vitest-chrome's schema. */
Object.assign(chrome.storage, {
    session: {
        clear: vi.fn(),
        get: vi.fn(() => Promise.resolve({})),
        getBytesInUse: vi.fn(),
        remove: vi.fn(),
        set: vi.fn(),
        onChanged: storageAreaEvent,
    },
});
