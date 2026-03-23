import { loadConfiguration, updateConfiguration } from "../configuration";
import { logError } from "../log";
import { queue } from "./queue";

const MAX_TIMEOUT_MINUTES = 1440;

const timeoutInput = document.getElementById(
  "timeout",
) as HTMLInputElement | null;
const timeoutStatus = document.getElementById(
  "timeout-status",
) as HTMLDivElement | null;
const domainListEl = document.getElementById(
  "domain-list",
) as HTMLUListElement | null;
const newDomainInput = document.getElementById(
  "new-domain",
) as HTMLInputElement | null;
const addDomainBtn = document.getElementById(
  "add-domain-btn",
) as HTMLButtonElement | null;

if (
  !timeoutInput ||
  !timeoutStatus ||
  !domainListEl ||
  !newDomainInput ||
  !addDomainBtn
) {
  throw new Error("Required DOM elements not found — check options.html IDs");
}

let excludedDomains: string[] = [];

function renderDomainList(): void {
  domainListEl!.innerHTML = "";

  if (excludedDomains.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = "No domains excluded yet.";
    domainListEl!.appendChild(p);
    return;
  }

  const sorted = [...excludedDomains].sort();
  for (const domain of sorted) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = domain;

    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "Remove";
    btn.setAttribute("aria-label", `Remove ${domain} from exclusions`);
    btn.addEventListener("click", () =>
      queue("click removeDomain", () => removeDomain(domain)),
    );

    li.appendChild(span);
    li.appendChild(btn);
    domainListEl!.appendChild(li);
  }
}

async function loadSettings(): Promise<void> {
  try {
    const config = await loadConfiguration();
    timeoutInput!.value = String(config.timeoutMinutes);
    excludedDomains = Array.from(config.excludedDomains);
    renderDomainList();
  } catch (error) {
    logError("Failed to load settings", error);
  }
}

function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  if (value.includes("://")) {
    try {
      value = new URL(value).hostname;
    } catch {
      return null;
    }
  } else {
    const slash = value.indexOf("/");
    if (slash !== -1) value = value.slice(0, slash);
    const question = value.indexOf("?");
    if (question !== -1) value = value.slice(0, question);
  }

  if (!value || value.includes(" ")) return null;

  try {
    if (new URL(`https://${value}`).hostname !== value) return null;
  } catch {
    return null;
  }

  return value;
}

async function addDomain(): Promise<void> {
  const raw = newDomainInput!.value.trim();
  if (!raw) return;

  const domain = normalizeDomain(raw);
  if (!domain) {
    newDomainInput!.setCustomValidity("Enter a valid domain like example.com");
    newDomainInput!.reportValidity();
    return;
  }

  newDomainInput!.setCustomValidity("");

  if (excludedDomains.includes(domain)) {
    newDomainInput!.value = "";
    return;
  }

  excludedDomains.push(domain);

  return queue("addDomain", () =>
    updateConfiguration({ excludedDomains: new Set(excludedDomains) }),
  )
    .then(() => {
      renderDomainList();
    })
    .catch(() => {
      excludedDomains = excludedDomains.filter((d) => d !== domain);
      newDomainInput!.value = "";
      renderDomainList();
    });
}

async function removeDomain(domain: string): Promise<void> {
  const previous = excludedDomains;
  excludedDomains = excludedDomains.filter((d) => d !== domain);

  return queue("removeDomain", () =>
    updateConfiguration({ excludedDomains: new Set(excludedDomains) }),
  )
    .then(() => {
      newDomainInput!.value = "";
      renderDomainList();
    })
    .catch(() => {
      excludedDomains = previous;
      newDomainInput!.value = "";
      renderDomainList();
    });
}

let statusClearTimer: ReturnType<typeof setTimeout> | null = null;

function showStatus(text: string) {
  if (statusClearTimer !== null) clearTimeout(statusClearTimer);
  timeoutStatus!.textContent = text;
  statusClearTimer = setTimeout(() => {
    timeoutStatus!.textContent = "";
  }, 2000);
}

async function persistTimeoutIfValid(): Promise<void> {
  const raw = timeoutInput!.value.trim();
  const value = Number(raw);

  if (
    !raw ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_TIMEOUT_MINUTES
  ) {
    if (timeoutInput!.value !== "") {
      await showStatus(`Enter a value between 1 and ${MAX_TIMEOUT_MINUTES}.`);
    }
    return;
  }

  await queue("persistTimeoutIfValid", async () => {
    await updateConfiguration({ timeoutMinutes: value });
    await showStatus("Saved.");
  }).catch(() => showStatus("Failed to save."));
}

timeoutInput!.addEventListener("input", () => {
  void persistTimeoutIfValid();
});

timeoutInput!.addEventListener("blur", () => {
  void persistTimeoutIfValid();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    void persistTimeoutIfValid();
  }
});

window.addEventListener("pagehide", () => {
  void persistTimeoutIfValid();
});

addDomainBtn!.addEventListener("click", () => {
  void addDomain();
});

newDomainInput!.addEventListener("keydown", (e: KeyboardEvent) => {
  newDomainInput!.setCustomValidity("");
  if (e.key === "Enter") {
    void addDomain();
  }
});

chrome.storage.sync.onChanged.addListener((changes) => {
  if (!changes.timeoutMinutes && !changes.excludedDomains) {
    return;
  }
  void queue("chrome.storage.sync.onChanged - options", () =>
    loadConfiguration()
      .then((config) => {
        excludedDomains = Array.from(config.excludedDomains);
        renderDomainList();
        timeoutInput!.value = String(config.timeoutMinutes);
      })
      .catch((err) => logError("Failed to refresh settings from storage", err)),
  );
});

timeoutInput!.disabled = true;
newDomainInput!.disabled = true;
addDomainBtn!.disabled = true;

queue("loadSettings", loadSettings)
  .then(() => {
    timeoutInput!.disabled = false;
    newDomainInput!.disabled = false;
    addDomainBtn!.disabled = false;
  })
  .catch((err) => logError("Failed to load settings", err));
