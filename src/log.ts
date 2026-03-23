import { State } from "./service-worker/state";

const PREFIX = "[Flotsam]";

export function logState(message: string, before: State, after: State): void {
    logDebug(message, {
        before,
        after,
    });
}

export function logDebug(message: string, details?: unknown): void {
    if (details === undefined) {
        console.debug(PREFIX, message);
        return;
    }
    console.debug(PREFIX, message, details);
}

export function logError(message: string, error: unknown): void {
    console.error(PREFIX, message, error);
}
