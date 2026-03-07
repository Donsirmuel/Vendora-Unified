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

  const mediaProxyUrl = (mediaPath: string) => {
    const cleanPath = mediaPath.replace(/^\/+/, "");
    return `${apiOrigin}/api/v1/media/${cleanPath}`;
  };

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const normalized = forceHttpsIfNeeded(raw);
    try {
      const parsed = new URL(normalized);
      const mediaIndex = parsed.pathname.indexOf("/media/");
      if (mediaIndex >= 0) {
        const relativeMedia = parsed.pathname.slice(mediaIndex + "/media/".length);
        return mediaProxyUrl(relativeMedia);
      }
    } catch {
      return normalized;
    }
    return normalized;
  }

  if (raw.startsWith("//")) {
    return isBrowser ? `${window.location.protocol}${raw}` : `https:${raw}`;
  }

  if (raw.startsWith("/")) {
    if (raw.startsWith("/media/")) {
      return mediaProxyUrl(raw.slice("/media/".length));
    }
    return `${apiOrigin}${raw}`;
  }

  if (raw.startsWith("media/")) {
    return mediaProxyUrl(raw.slice("media/".length));
  }

  return `${apiOrigin}/${raw.replace(/^\/+/, "")}`;
}
