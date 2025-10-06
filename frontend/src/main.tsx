import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from '@/components/ErrorBoundary'
import './index.css'
// Shared page animations and decorative styles used by Home, Signup, Login, Dashboard
import './pages/home.css'
import { http, tokenStore } from '@/lib/http'
import { setUpdateAvailable } from '@/lib/sw-updates'
import { requestUpdate, subscribeToSWUpdate } from '@/lib/sw-updates'
import { toast } from '@/components/ui/use-toast'

createRoot(document.getElementById("root")!).render(
	<ErrorBoundary>
		<App />
	</ErrorBoundary>
);

export type PushRegistrationResult =
	| 'subscribed'
	| 'permission-blocked'
	| 'prompt-required'
	| 'unsupported'
	| 'error'
	| 'unauthenticated';

// Register service worker and subscribe to push when available
async function registerPush({ promptPermission = false, force = false }: { promptPermission?: boolean; force?: boolean } = {}): Promise<PushRegistrationResult> {
	if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
		return 'unsupported';
	}
	try {
		const reg = await navigator.serviceWorker.register('/sw.js');
		const attemptImmediateUpdate = async (message?: string) => {
			if (message) {
				toast({ title: 'Updating Vendora', description: message });
			}
			try {
				const applied = await requestUpdate();
				if (!applied) {
					setUpdateAvailable(true);
				}
			} catch {
				setUpdateAvailable(true);
			}
		};
		// Optionally trigger skipWaiting when an update is found (without forcing a reload here)
		if (reg.waiting) {
			void attemptImmediateUpdate('New version detected — reloading now…');
		}
		reg.addEventListener('updatefound', () => {
			const newWorker = reg.installing;
			if (!newWorker) return;
			newWorker.addEventListener('statechange', () => {
				if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
					void attemptImmediateUpdate('New version detected — reloading now…');
				}
			});
		});

		// When a new service worker takes control, reload once to apply the new code
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			window.location.reload();
		});

		let subscription = await reg.pushManager.getSubscription();
		if (force && subscription) {
			await subscription.unsubscribe().catch(() => {});
			subscription = null;
		}

		let permission: NotificationPermission = Notification.permission;
		if (!subscription) {
			if (permission === 'default') {
				if (!promptPermission) {
					return 'prompt-required';
				}
				permission = await Notification.requestPermission();
			}
			if (permission !== 'granted') {
				return permission === 'denied' ? 'permission-blocked' : 'prompt-required';
			}
			const vapidResp = await http.get<{ publicKey: string }>('/api/v1/notifications/vapid-key/');
			const vapidKey = vapidResp.data?.publicKey;
			subscription = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: vapidKey ? urlBase64ToUint8Array(vapidKey) : undefined,
			});
		}
		if (subscription) {
			await http.post('/api/v1/notifications/subscribe/', subscription);
			return 'subscribed';
		}
		return 'error';
	} catch (e) {
		return 'error';
	}
}

function urlBase64ToUint8Array(base64String: string) {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
	return outputArray;
}

export async function ensurePushRegistered(options: { force?: boolean; prompt?: boolean } = {}): Promise<PushRegistrationResult> {
	const { force = false, prompt = false } = options;
	try {
		if (!tokenStore.get()?.access) return 'unauthenticated';
		if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
			return 'unsupported';
		}
		const existingReg = await navigator.serviceWorker.getRegistration('/sw.js');
		if (existingReg && !force) {
			const existing = await existingReg.pushManager.getSubscription();
			if (existing && Notification.permission === 'granted') {
				return 'subscribed';
			}
		}
		return await registerPush({ promptPermission: prompt || Notification.permission === 'default', force });
	} catch {
		return 'error';
	}
}

if (tokenStore.get()?.access) {
	const schedule = (fn: () => void) =>
		("requestIdleCallback" in window
			? (window as any).requestIdleCallback(fn)
			: setTimeout(fn, 1500));
	schedule(() => ensurePushRegistered());
}

// Custom install prompt (deferred)
let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e: any) => {
	e.preventDefault();
	deferredPrompt = e;
	// You can store a signal to show an Install button in your UI
	localStorage.setItem('vendora_can_install', '1');
});
export async function promptInstall() {
	if (!deferredPrompt) return false;
	deferredPrompt.prompt();
	const { outcome } = await deferredPrompt.userChoice;
	deferredPrompt = null;
	localStorage.removeItem('vendora_can_install');
	return outcome === 'accepted';
}

// App Badging helpers
export function setBadge(n: number) {
	try {
		if ('setAppBadge' in navigator && n > 0) (navigator as any).setAppBadge(n);
		else if ('clearAppBadge' in navigator) (navigator as any).clearAppBadge();
	} catch {}
}

// Background Sync registration (one-off)
async function registerBackgroundSync() {
	if (!('serviceWorker' in navigator)) return;
	try {
		const reg = await navigator.serviceWorker.ready;
		if ('sync' in reg) {
			// Tag name matches SW handler
			await (reg as any).sync.register('vendora-sync');
		}
	} catch {}
}

// Periodic Background Sync registration
async function registerPeriodicSync() {
	try {
		const reg: any = await navigator.serviceWorker.ready;
		if ('periodicSync' in reg) {
			await reg.periodicSync.register('vendora-periodic', { minInterval: 15 * 60 * 1000 });
		}
	} catch {}
}

// Background Fetch demo (guarded)
export async function startBackgroundFetch(id = 'vendora-bgf', url = '/api/v1/orders/?status=pending') {
	try {
		const reg: any = await navigator.serviceWorker.ready;
		if ('backgroundFetch' in reg) {
			await reg.backgroundFetch.fetch(id, [url], {
				title: 'Fetching updates…',
				icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
			});
		}
	} catch {}
}

// Schedule background capabilities lazily
if ('serviceWorker' in navigator) {
	const scheduleLight = (fn: () => void) => setTimeout(fn, 2000);
	scheduleLight(registerBackgroundSync);
	scheduleLight(registerPeriodicSync);
}

// Graceful recovery for code-split chunk load failures (e.g., network issues or new deploy)
window.addEventListener('error', (e: any) => {
	const msg = String(e?.message || '').toLowerCase();
	if (msg.includes('loading chunk') || msg.includes('chunk load')) {
		const shouldReload = confirm('A new version was deployed or a network error occurred. Reload to continue?');
		if (shouldReload) window.location.reload();
	}
});
