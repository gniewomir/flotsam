import { logError, logState } from "../log";
import {
    Configuration,
    defaultConfiguration,
    loadConfiguration,
    updateConfiguration,
} from "../configuration";
import { defaultSession, loadSession, Session, updateSession } from "./session";

/**
 * The responsibility of this module is keeping track of extension state.
 *
 * State aggregates:
 *   - configuration (sync storage),
 *   - session (session storage),
 *   - transient (in-memory, tied to service worker lifetime).
 * State is a key→value dictionary.
 *
 * Authoritative state is kept in memory (tied to service worker lifetime).
 *   - Initial state is created from defaults synchronously.
 *   - Hydration from storage is enqueued as the first task in the queue during module evaluation (service worker start);
 *     therefore, it has to finish before any other payload is run
 *
 * State is mutated by a single-writer mutation FIFO queue:
 *   - There is always at most one payload running at any given time.
 *   - Every mutation means creation of a new state object.
 *   - Every new state is logged
 *
 * A payload is defined as an async callback that takes the current state and returns a partial state update or empty object
 *   - The payload receives a structuredClone of the current state when it is enqueued, so it cannot mutate the current state directly.
 *   - Each queued payload runs after the previous payload’s work is completed.
 *   - Each payload that completes its work returns a partial state update or empty object.
 *     - Payloads must return only keys/values they intend to mutate.
 *     - If an empty state partial is returned, the current state is kept as is.
 *     - If the state partial is not empty, a new state object is created with the state partial spread on top.
 *
 * Module public API `queueStateful` will queue payload and pass partial state update to session & configuration storage functions,
 * they will determine if storage update is needed
 *
 * The module listens for configuration (sync) storage changes, which may be performed from other contexts,
 * and queues an update of in-memory state from configuration storage
 *   - Note: configuration updates can be triggered from another browser & device and propagated by sync.
 *   - Note: configuration updates can be triggered bby options page and context menu.
 *
 * The module does not listen for session storage changes (which must not be performed from other contexts).
 *
 * Design limitations:
 *   - A payload must not enqueue another payload.
 *   - Payloads must intentionally return only keys/values they intend to mutate.
 *   - Session must not be modified from other contexts (e.g. options page).
 *   - Payloads must be lightweight to prevent uncontrolled queue growth; the queue needs to be drained quickly to keep up.
 *
 * Known/acceptable risks:
 *   - Losing queued payloads and therefore possible state updates because of the service worker being killed is an extremely unlikely scenario,
 *     as every Chrome API call resets the timers used to determine the service worker’s "idle" state;
 *     a rough estimate of the time between the idle state of the service worker and its being killed is around 30s,
 *     which should be enough in all realistic scenarios.
 *   - We log Chrome storage errors, but there will be no explicit recovery/retry.
 *     - We will have ample opportunity to update session during service worker lifetime.
 *     - A missed configuration update is an acceptable risk compared to additional complexity of handling it;
 *       this decision might be revisited if specific error scenarios are discovered.
 *
 * Goals:
 *   - State updates should be sequential, observable, and easy to reason about.
 */

type Transient = {
    activeTabByWindow: Map<number, number>;
};
const defaultTransientState: Transient = {
    activeTabByWindow: new Map<number, number>(),
};

export type State = Configuration & Session & Transient;
let state: State = {
    ...defaultConfiguration,
    ...defaultSession,
    ...defaultTransientState,
};

/**
 * Task queue (chain-only; payload return types vary)
 */
let taskQueue: Promise<unknown> = Promise.resolve({});

void queue("initial - state - configuration load", async () => {
    state = structuredClone({ ...state, ...(await loadConfiguration()) });
});
void queue("initial - state - session load", async () => {
    state = structuredClone({ ...state, ...(await loadSession()) });
});

chrome.storage.sync.onChanged.addListener(() => {
    queue("chrome.storage.sync.onChanged - state - reloaded configuration", async () => {
        state = structuredClone({
            ...state,
            ...(await loadConfiguration()),
        });
    });
});

/**
 * PUBLIC API
 */

/**
 * @internal Exposed only for convenience of E2E tests
 */
export function queueStatefulAsync(
    initiator: string,
    payload: (state: State) => Promise<Partial<State>>,
): Promise<void> {
    const promise = taskQueue.then(async () => {
        let stateChanges: Partial<State>;
        try {
            stateChanges = await payload(structuredClone(state));
        } catch (error) {
            logError(`Error while running payload for initiator "${initiator}"`, error as Error);
            stateChanges = {};
        }
        if (Object.keys(stateChanges).length === 0) {
            return;
        }
        const previousState = state;
        const nextState = { ...state, ...stateChanges };
        state = nextState;
        logState(
            `State transition triggered by initiator "${initiator}"`,
            previousState,
            nextState,
        );
        try {
            await Promise.all([updateConfiguration(stateChanges), updateSession(stateChanges)]);
        } catch (error) {
            logError(
                `Error while running payload for initiator "${initiator}" - ` +
                    `failed to update configuration or session`,
                error as Error,
            );
        }
    });
    taskQueue = promise.catch(() => {});
    return promise;
}

/**
 * Queue payload which uses and may mutate state
 * Will update persistence when applicable
 * @param initiator
 * @param payload
 */
export function queueStateful(
    initiator: string,
    payload: (state: State) => Promise<Partial<State>>,
): void {
    void queueStatefulAsync(initiator, payload);
}

/**
 * Queue payload which does not require state
 * @param initiator
 * @param payload
 */
export function queue(initiator: string, payload: () => Promise<void>): void {
    taskQueue = taskQueue
        .then(payload)
        .then(() => {
            return {};
        })
        .catch((error: Error) => {
            logError(`Error while running payload for initiator ${initiator}`, error);
            return {};
        });
}
