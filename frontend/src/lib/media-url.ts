export function resolveMediaUrl(input?: string | null): string {
  if (!input) return "";

  const raw = String(input).trim();
  if (!raw) return "";
  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;

  const isBrowser = typeof window !== "undefined";
  const fallbackOrigin = isBrowser ? window.location.origin : "";
  const apiBase = (import.meta as any).env?.VITE_API_BASE || fallbackOrigin;

  let apiOrigin = fallbackOrigin;
  try {
    apiOrigin = new URL(apiBase, fallbackOrigin).origin;
  } catch {
    apiOrigin = fallbackOrigin;
  }

  const forceHttpsIfNeeded = (url: string) => {
    if (isBrowser && window.location.protocol === "https:" && url.startsWith("http://")) {
      return url.replace(/^http:\/\//i, "https://");
    }
    return url;
  };

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return forceHttpsIfNeeded(raw);
  }

  if (raw.startsWith("//")) {
    return isBrowser ? `${window.location.protocol}${raw}` : `https:${raw}`;
  }

  if (raw.startsWith("/")) {
    return `${apiOrigin}${raw}`;
  }

  return `${apiOrigin}/${raw.replace(/^\/+/, "")}`;
}
