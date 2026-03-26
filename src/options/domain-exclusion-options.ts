import { updateConfiguration } from "../configuration";
import type { queue as queueFn } from "./queue";

export type DomainExclusionOptionsController = {
    setExcludedDomains: (domains: Iterable<string>) => void;
    setDisabled: (disabled: boolean) => void;
};

export function initDomainExclusionOptions(args: {
    domainListEl: HTMLUListElement;
    newDomainInput: HTMLInputElement;
    addDomainBtn: HTMLButtonElement;
    queue: typeof queueFn;
}): DomainExclusionOptionsController {
    const { domainListEl, newDomainInput, addDomainBtn, queue } = args;

    let excludedDomains: string[] = [];

    function renderDomainList(): void {
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
            btn.addEventListener("click", () => {
                removeDomain(domain);
            });

            li.appendChild(span);
            li.appendChild(btn);
            domainListEl.appendChild(li);
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
        const raw = newDomainInput.value.trim();
        if (!raw) return;

        const domain = normalizeDomain(raw);
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

        return queue("addDomain", () =>
            updateConfiguration({ excludedDomains: new Set(excludedDomains) }),
        )
            .then(() => {
                renderDomainList();
            })
            .catch(() => {
                excludedDomains = excludedDomains.filter((d) => d !== domain);
                newDomainInput.value = "";
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
                newDomainInput.value = "";
                renderDomainList();
            })
            .catch(() => {
                excludedDomains = previous;
                newDomainInput.value = "";
                renderDomainList();
            });
    }

    addDomainBtn.addEventListener("click", () => {
        void addDomain();
    });

    newDomainInput.addEventListener("keydown", (e: KeyboardEvent) => {
        newDomainInput.setCustomValidity("");
        if (e.key === "Enter") {
            void addDomain();
        }
    });

    return {
        setExcludedDomains: (domains: Iterable<string>) => {
            excludedDomains = Array.from(domains);
            renderDomainList();
        },
        setDisabled: (disabled: boolean) => {
            newDomainInput.disabled = disabled;
            addDomainBtn.disabled = disabled;
        },
    };
}
