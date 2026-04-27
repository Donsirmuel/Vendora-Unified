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
 * Connect to backend SSE.
 * Fetches a short-lived stream ticket over authenticated HTTP, then uses that
 * ticket in the EventSource query string to avoid leaking long-lived JWTs.
 */
export function connectSSE(path = '/api/v1/stream/', handlers: SSEHandlers = {}) {
  let es: EventSource | null = null;
  let stopped = false;
  let backoff = 1000; // start at 1s

  const getTicketPath = (streamPath: string) => {
    if (streamPath.endsWith('/stream/')) {
      return streamPath.replace('/stream/', '/stream-ticket/');
    }
    if (streamPath.endsWith('/stream')) {
      return streamPath.replace('/stream', '/stream-ticket/');
    }
    return '/api/v1/stream-ticket/';
  };

  const requestStreamTicket = async () => {
    const token = getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const ticketPath = getTicketPath(path);
    const res = await fetch(ticketPath, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'omit',
    });

    if (!res.ok) {
      throw new Error('Failed to request stream ticket');
    }

    const data = await res.json();
    return data?.stream_ticket as string;
  };

  const connect = async () => {
    if (stopped) return;
    let streamTicket: string;
    try {
      streamTicket = await requestStreamTicket();
    } catch (err) {
      if (!stopped) {
        handlers.onError?.(new Event('error'));
        setTimeout(() => {
          void connect();
        }, backoff);
        backoff = Math.min(backoff * 2, 30000);
      }
      return;
    }

    if (stopped) return;

    const url = new URL(path, window.location.origin);
    url.searchParams.set('st', streamTicket);
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
        setTimeout(() => {
          void connect();
        }, backoff);
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

  void connect();

  return {
    close: () => {
      stopped = true;
      try { es?.close(); } catch { /* noop */ }
      es = null;
    },
  };
}
