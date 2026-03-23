export type Configuration = {
    timeoutMinutes: number;
    excludedDomains: Set<string>;
};
export const defaultConfiguration: Configuration = {
    timeoutMinutes: 15,
    excludedDomains: new Set<string>([]),
};

export type ConfigurationStorage = {
    timeoutMinutes: number;
    excludedDomains: string[];
};

export async function updateConfiguration(
    configurationChanges: Partial<Configuration>,
): Promise<void> {
    const update: Partial<ConfigurationStorage> = {};

    const timeoutMinutesKey = "timeoutMinutes" satisfies keyof Configuration &
        keyof ConfigurationStorage;
    if (
        timeoutMinutesKey in configurationChanges &&
        configurationChanges[timeoutMinutesKey] !== undefined
    ) {
        update[timeoutMinutesKey] = configurationChanges[timeoutMinutesKey];
    }

    const excludedDomainsKey = "excludedDomains" satisfies keyof Configuration &
        keyof ConfigurationStorage;
    if (
        excludedDomainsKey in configurationChanges &&
        configurationChanges[excludedDomainsKey] !== undefined
    ) {
        update[excludedDomainsKey] = Array.from(configurationChanges[excludedDomainsKey]);
    }

    if (Object.keys(update).length === 0) {
        return;
    }
    await chrome.storage.sync.set(update);
}

/**
 * In case of invalid or missing configuration return defaults
 */
export async function loadConfiguration(): Promise<Configuration> {
    const rawConfiguration = await chrome.storage.sync.get(null);
    const timeoutMinutes =
        typeof rawConfiguration.timeoutMinutes === "number" &&
        rawConfiguration.timeoutMinutes > 0 &&
        rawConfiguration.timeoutMinutes <= 1440
            ? rawConfiguration.timeoutMinutes
            : defaultConfiguration.timeoutMinutes;
    const excludedDomains = Array.isArray(rawConfiguration.excludedDomains)
        ? new Set(
              rawConfiguration.excludedDomains.filter(
                  (domain): domain is string => typeof domain === "string",
              ),
          )
        : defaultConfiguration.excludedDomains;
    return {
        timeoutMinutes,
        excludedDomains,
    };
}
