import { updateConfiguration } from "../configuration";
import type { queue as queueFn } from "./queue";

const MAX_TIMEOUT_MINUTES = 1440;

export type TimeoutOptionsController = {
    setTimeoutMinutes: (minutes: number) => void;
    persistTimeoutIfValid: () => Promise<void>;
    setDisabled: (disabled: boolean) => void;
};

export function initTimeoutOptions(args: {
    timeoutInput: HTMLInputElement;
    timeoutStatus: HTMLDivElement;
    queue: typeof queueFn;
}): TimeoutOptionsController {
    const { timeoutInput, timeoutStatus, queue } = args;

    let statusClearTimer: ReturnType<typeof setTimeout> | null = null;

    function showStatus(text: string) {
        if (statusClearTimer !== null) clearTimeout(statusClearTimer);
        timeoutStatus.textContent = text;
        statusClearTimer = setTimeout(() => {
            timeoutStatus.textContent = "";
        }, 2000);
    }

    async function persistTimeoutIfValid(): Promise<void> {
        const raw = timeoutInput.value.trim();
        const value = Number(raw);

        if (!raw || !Number.isInteger(value) || value < 1 || value > MAX_TIMEOUT_MINUTES) {
            if (timeoutInput.value !== "") {
                showStatus(`Enter a value between 1 and ${MAX_TIMEOUT_MINUTES}.`);
            }
            return;
        }

        await queue("persistTimeoutIfValid", async () => {
            await updateConfiguration({ timeoutMinutes: value });
            showStatus("Saved.");
        }).catch(() => showStatus("Failed to save."));
    }

    timeoutInput.addEventListener("input", () => {
        void persistTimeoutIfValid();
    });

    timeoutInput.addEventListener("blur", () => {
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

    return {
        setTimeoutMinutes: (minutes: number) => {
            timeoutInput.value = String(minutes);
        },
        persistTimeoutIfValid,
        setDisabled: (disabled: boolean) => {
            timeoutInput.disabled = disabled;
        },
    };
}
