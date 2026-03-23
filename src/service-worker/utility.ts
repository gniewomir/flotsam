export const SUPPORTED_PROTOCOLS: ReadonlySet<string> = new Set(["http:", "https:"]);

export function isManagedUrl(url: string | undefined): boolean {
    if (!url) {
        return false;
    }
    try {
        return SUPPORTED_PROTOCOLS.has(new URL(url).protocol);
    } catch {
        return false;
    }
}
