export function extractDomain(url: string | undefined): string | null {
  if (!url) {
    return null;
  }
  try {
    const hostname = new URL(url).hostname;
    return hostname || null;
  } catch {
    return null;
  }
}
