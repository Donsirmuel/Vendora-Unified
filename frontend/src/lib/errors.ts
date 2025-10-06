import { AxiosError } from 'axios';

function flattenObject(obj: unknown): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map((v) => String(v)).join('; ');
  if (typeof obj === 'object' && obj !== null) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v == null) continue;
      if (typeof v === 'string') parts.push(`${k}: ${v}`);
      else if (Array.isArray(v)) parts.push(`${k}: ${v.map((x) => String(x)).join('; ')}`);
      else if (typeof v === 'object') parts.push(`${k}: ${flattenObject(v)}`);
      else parts.push(`${k}: ${String(v)}`);
    }
    return parts.join('; ');
  }
  return String(obj);
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  try {
    // Axios error shape
  const ax = err as AxiosError<unknown> & { message?: string };
    const data = ax?.response?.data;
    if (data && typeof data === 'object') {
      const detail = (data as { detail?: unknown }).detail;
      // Prefer normalized backend shape
      if (typeof detail === 'string' && detail.trim()) {
        return detail;
      }
      if (detail && typeof detail !== 'string') {
        const msg = flattenObject(detail);
        if (msg) return msg;
      }
      const flat = flattenObject(data);
      if (flat) return flat;
    }
    // Fallbacks
    if (ax?.message) return ax.message;
    return fallback;
  } catch {
    return fallback;
  }
}
