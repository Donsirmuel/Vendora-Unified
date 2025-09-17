import { AxiosError } from 'axios';

function flattenObject(obj: any): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (Array.isArray(obj)) return obj.map((v) => String(v)).join('; ');
  if (typeof obj === 'object') {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
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
    const ax = err as AxiosError<any> & { message?: string };
    const data = ax?.response?.data;
    if (data) {
      // Prefer normalized backend shape
      if (typeof data.detail === 'string' && data.detail.trim()) {
        return data.detail;
      }
      if (data.detail && typeof data.detail !== 'string') {
        const msg = flattenObject(data.detail);
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
