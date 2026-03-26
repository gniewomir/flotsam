import { loadConfiguration } from "../configuration";
import { logError } from "../log";
import { initDomainExclusionOptions } from "./domain-exclusion-options";
import { queue } from "./queue";
import { initTimeoutOptions } from "./timeout-options";

const timeoutInput = document.getElementById("timeout") as HTMLInputElement | null;
const timeoutStatus = document.getElementById("timeout-status") as HTMLDivElement | null;

const domainListEl = document.getElementById("domain-list") as HTMLUListElement | null;
const newDomainInput = document.getElementById("new-domain") as HTMLInputElement | null;
const addDomainBtn = document.getElementById("add-domain-btn") as HTMLButtonElement | null;

if (!timeoutInput || !timeoutStatus || !domainListEl || !newDomainInput || !addDomainBtn) {
    throw new Error("Required DOM elements not found — check options.html IDs");
}

const timeoutController = initTimeoutOptions({
    timeoutInput,
    timeoutStatus,
    queue,
});

const domainController = initDomainExclusionOptions({
    domainListEl,
    newDomainInput,
    addDomainBtn,
    queue,
});

async function loadSettings(): Promise<void> {
    try {
        const config = await loadConfiguration();
        timeoutController.setTimeoutMinutes(config.timeoutMinutes);
        domainController.setExcludedDomains(config.excludedDomains);
    } catch (error) {
        logError("Failed to load settings", error);
    }
}

chrome.storage.sync.onChanged.addListener((changes) => {
    if (!changes.timeoutMinutes && !changes.excludedDomains) {
        return;
    }
    void queue("chrome.storage.sync.onChanged - options", () =>
        loadConfiguration()
            .then((config) => {
                domainController.setExcludedDomains(config.excludedDomains);
                timeoutController.setTimeoutMinutes(config.timeoutMinutes);
            })
            .catch((err) => logError("Failed to refresh settings from storage", err)),
    );
});

timeoutController.setDisabled(true);
domainController.setDisabled(true);

queue("loadSettings", loadSettings)
    .then(() => {
        timeoutController.setDisabled(false);
        domainController.setDisabled(false);
    })
    .catch((err) => logError("Failed to load settings", err));
