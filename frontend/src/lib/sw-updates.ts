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
      // Ask waiting worker to skipWaiting and wait for it to take control
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Wait for controllerchange so the new SW controls the page
      await new Promise<void>((resolve) => {
        const handler = () => {
          navigator.serviceWorker.removeEventListener('controllerchange', handler);
          resolve();
        };
        navigator.serviceWorker.addEventListener('controllerchange', handler);
      });
      return true;
    }
  } catch {}
  return false;
}
