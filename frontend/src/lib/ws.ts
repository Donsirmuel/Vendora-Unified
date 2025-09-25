import { useEffect, useRef, useState } from 'react';
import { tokenStore } from '@/lib/http';

export function usePaymentRequestSocket(onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = tokenStore.getAccessToken();
    const protocol = import.meta.env.VITE_WS_PROTOCOL || (window.location.protocol === 'https:' ? 'wss' : 'ws');
    const host = import.meta.env.VITE_API_HOST || '127.0.0.1:8000';
    const url = `${protocol}://${host}/ws/payment-requests/`;
    // Pass JWT via subprotocol to avoid leaking in URLs
    const protocols = token ? [`jwt.${token}`] : undefined;
    const ws = new WebSocket(url, protocols);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data);
        onMessage(parsed);
      } catch (e) {
        // if not JSON, pass raw
        onMessage(ev.data);
      }
    };

    return () => {
      try { ws.close(); } catch (e) {}
      wsRef.current = null;
    };
  }, [onMessage]);

  return { connected, ws: wsRef };
}
