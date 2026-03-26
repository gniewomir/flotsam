import { logError } from "../log";

/**
 * Task queue
 */
let taskQueue: Promise<void> = Promise.resolve();

export function queue(initiator: string, payload: () => void | Promise<void>): Promise<void> {
    const next = taskQueue.then(() => payload());

    // Keep the underlying queue chain alive even if this payload fails,
    // while still surfacing the failure to the caller of `queue`.
    taskQueue = next.catch((err) => {
        logError(`[${initiator}] Error in options page task queue `, err);
    });

    return next;
}
