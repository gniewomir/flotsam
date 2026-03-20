const STORAGE_KEY_TIMEOUT = "timeoutMinutes";
const STORAGE_KEY_EXCLUDED_DOMAINS = "excludedDomains";
const DEFAULT_TIMEOUT_MINUTES = 10;
const MAX_TIMEOUT_MINUTES = 1440;

const timeoutInput = document.getElementById("timeout");
const timeoutStatus = document.getElementById("timeout-status");
const domainListEl = document.getElementById("domain-list");
const newDomainInput = document.getElementById("new-domain");
const addDomainBtn = document.getElementById("add-domain-btn");

if (
  !timeoutInput ||
  !timeoutStatus ||
  !domainListEl ||
  !newDomainInput ||
  !addDomainBtn
) {
  throw new Error("Required DOM elements not found — check options.html IDs");
}

let excludedDomains = [];

function renderDomainList() {
  domainListEl.innerHTML = "";
  if (excludedDomains.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = "No domains excluded yet.";
    domainListEl.appendChild(p);
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
    btn.addEventListener("click", () => removeDomain(domain));
    li.appendChild(span);
    li.appendChild(btn);
    domainListEl.appendChild(li);
  }
}

async function loadSettings() {
  let result;
  try {
    result = await chrome.storage.local.get([
      STORAGE_KEY_TIMEOUT,
      STORAGE_KEY_EXCLUDED_DOMAINS,
    ]);
  } catch (error) {
    console.error("[Flotsam] Failed to load settings", error);
    return;
  }

  const timeout = result[STORAGE_KEY_TIMEOUT];
  timeoutInput.value = String(
    typeof timeout === "number" && timeout > 0
      ? timeout
      : DEFAULT_TIMEOUT_MINUTES,
  );

  const domains = result[STORAGE_KEY_EXCLUDED_DOMAINS];
  excludedDomains = Array.isArray(domains)
    ? domains.filter((d) => typeof d === "string")
    : [];
  renderDomainList();
}

function normalizeDomain(input) {
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

async function addDomain() {
  const raw = newDomainInput.value.trim();
  if (!raw) return;
  const domain = normalizeDomain(newDomainInput.value);
  if (!domain) {
    newDomainInput.setCustomValidity("Enter a valid domain like example.com");
    newDomainInput.reportValidity();
    return;
  }
  newDomainInput.setCustomValidity("");
  if (excludedDomains.includes(domain)) {
    newDomainInput.value = "";
    return;
  }
  excludedDomains.push(domain);
  try {
    await chrome.storage.local.set({
      [STORAGE_KEY_EXCLUDED_DOMAINS]: excludedDomains,
    });
  } catch (error) {
    console.error("[Flotsam] Failed to save excluded domains", error);
    excludedDomains = excludedDomains.filter((d) => d !== domain);
    return;
  }
  newDomainInput.value = "";
  renderDomainList();
}

async function removeDomain(domain) {
  const previous = excludedDomains;
  excludedDomains = excludedDomains.filter((d) => d !== domain);
  try {
    await chrome.storage.local.set({
      [STORAGE_KEY_EXCLUDED_DOMAINS]: excludedDomains,
    });
  } catch (error) {
    console.error("[Flotsam] Failed to save excluded domains", error);
    excludedDomains = previous;
    return;
  }
  renderDomainList();
}

const TIMEOUT_SAVE_DEBOUNCE_MS = 400;

let saveTimer = null;
let statusClearTimer = null;

function showStatus(text) {
  clearTimeout(statusClearTimer);
  timeoutStatus.textContent = text;
  statusClearTimer = setTimeout(() => (timeoutStatus.textContent = ""), 2000);
}

async function persistTimeoutIfValid() {
  const raw = timeoutInput.value.trim();
  const value = Number(raw);
  if (
    !raw ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_TIMEOUT_MINUTES
  ) {
    if (timeoutInput.value !== "") {
      showStatus(`Enter a value between 1 and ${MAX_TIMEOUT_MINUTES}.`);
    }
    return;
  }
  try {
    await chrome.storage.local.set({ [STORAGE_KEY_TIMEOUT]: value });
    showStatus("Saved.");
  } catch (error) {
    console.error("[Flotsam] Failed to save timeout", error);
    showStatus("Failed to save.");
  }
}

function scheduleTimeoutSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void persistTimeoutIfValid();
  }, TIMEOUT_SAVE_DEBOUNCE_MS);
}

/** Run any debounced timeout save immediately (navigation / blur). */
function flushPendingTimeoutSave() {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  void persistTimeoutIfValid();
}

timeoutInput.addEventListener("input", () => {
  scheduleTimeoutSave();
});

timeoutInput.addEventListener("blur", () => {
  flushPendingTimeoutSave();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushPendingTimeoutSave();
  }
});

window.addEventListener("pagehide", () => {
  flushPendingTimeoutSave();
});

addDomainBtn.addEventListener("click", () => {
  void addDomain().catch((err) =>
    console.error("[Flotsam] Unhandled in addDomain", err),
  );
});

newDomainInput.addEventListener("keydown", (e) => {
  newDomainInput.setCustomValidity("");
  if (e.key === "Enter") {
    void addDomain().catch((err) =>
      console.error("[Flotsam] Unhandled in addDomain", err),
    );
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[STORAGE_KEY_EXCLUDED_DOMAINS]) {
    const newValue = changes[STORAGE_KEY_EXCLUDED_DOMAINS].newValue;
    excludedDomains = Array.isArray(newValue)
      ? newValue.filter((d) => typeof d === "string")
      : [];
    renderDomainList();
  }
  if (changes[STORAGE_KEY_TIMEOUT]) {
    const newTimeout = changes[STORAGE_KEY_TIMEOUT].newValue;
    if (typeof newTimeout === "number" && newTimeout > 0) {
      timeoutInput.value = String(newTimeout);
    }
  }
});

timeoutInput.disabled = true;
newDomainInput.disabled = true;
addDomainBtn.disabled = true;
void loadSettings()
  .finally(() => {
    timeoutInput.disabled = false;
    newDomainInput.disabled = false;
    addDomainBtn.disabled = false;
  })
  .catch((err) => console.error("[Flotsam] Unhandled in loadSettings", err));
