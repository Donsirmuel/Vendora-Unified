import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { http, tokenStore } from '@/lib/http'

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker and subscribe to push when available
async function registerPush() {
	if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
	try {
		const reg = await navigator.serviceWorker.register('/sw.js');
	// Ask for permission
	const perm = await Notification.requestPermission();
	if (perm !== 'granted') return;
	// Get VAPID public key from backend
	const vapidResp = await http.get<{ publicKey: string }>('/api/v1/notifications/vapid-key/');
	const vapidKey = vapidResp.data?.publicKey;
		const subscription = await reg.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: vapidKey ? urlBase64ToUint8Array(vapidKey) : undefined,
		});
		// Persist subscription in backend
	await http.post('/api/v1/notifications/subscribe/', subscription);
	} catch (e) {
		// Ignore failures silently for now
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

if (tokenStore.get()?.access) {
	registerPush();
}
