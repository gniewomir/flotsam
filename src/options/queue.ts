import { logError } from "../log";

/**
 * Task queue
 */
let taskQueue: Promise<void> = Promise.resolve();

export function queue(initiator: string, payload: () => Partial<void>) {
  taskQueue = taskQueue
    .then(() => payload())
    .catch((err) => {
      logError(`[${initiator}] Error in options page task queue `, err);
      return Promise.reject(err);
    });
  return taskQueue;
}
