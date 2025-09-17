const EVT = 'vendora:sw-update-available';
const emitter = new EventTarget();
let available = false;

export function isUpdateAvailable() {
  return available;
}

export function subscribeToSWUpdate(cb: (flag: boolean) => void) {
  const handler = () => cb(available);
  emitter.addEventListener(EVT, handler);
  return () => emitter.removeEventListener(EVT, handler);
}

export function setUpdateAvailable(flag: boolean) {
  available = flag;
  emitter.dispatchEvent(new Event(EVT));
}

export async function requestUpdate(): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    }
  } catch {}
  return false;
}
