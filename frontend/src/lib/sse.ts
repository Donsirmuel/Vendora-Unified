import { getAccessToken } from './auth';

export type SSEEvent = {
  type: string;
  data: any;
};

export type SSEHandlers = {
  onMessage?: (event: SSEEvent) => void;
  onError?: (err: Event) => void;
  onOpen?: () => void;
};

/**
 * Connect to backend SSE. Uses token query param since EventSource can't set headers.
 * Auto-reconnects with backoff up to ~30s.
 */
export function connectSSE(path = '/api/v1/stream/', handlers: SSEHandlers = {}) {
  let es: EventSource | null = null;
  let stopped = false;
  let backoff = 1000; // start at 1s

  const connect = () => {
    if (stopped) return;
  const url = new URL(path, window.location.origin);
  const token = getAccessToken();
  if (token) url.searchParams.set('token', token);
  es = new EventSource(url.toString(), { withCredentials: false });
    es.onopen = () => {
      backoff = 1000; // reset backoff
      handlers.onOpen?.();
    };
    es.onerror = (e) => {
      handlers.onError?.(e);
      // Close and attempt reconnect with backoff
      try { es?.close(); } catch { /* noop */ }
      es = null;
      if (!stopped) {
        setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 30000);
      }
    };
    es.addEventListener('snapshot', (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data);
        handlers.onMessage?.({ type: 'snapshot', data });
      } catch {
        // ignore
      }
    });
    // default message handler if event type not specified
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        handlers.onMessage?.({ type: 'message', data });
      } catch {
        // ignore
      }
    };
  };

  connect();

  return {
    close: () => {
      stopped = true;
      try { es?.close(); } catch { /* noop */ }
      es = null;
    },
  };
}
