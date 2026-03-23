import type { State } from "./state";
import { isManagedUrl } from "./utility";
import { extractDomain } from "../utility";

/**
 * Add the tab's hostname to excluded domains (same rules as the context menu).
 */
export function excludeDomainFromManagedUrl(
  state: State,
  url: string | undefined,
): Partial<State> {
  if (!isManagedUrl(url)) return {};
  const domain = extractDomain(url);
  if (!domain) return {};

  state.excludedDomains.add(domain);

  return {
    excludedDomains: state.excludedDomains,
  };
}
