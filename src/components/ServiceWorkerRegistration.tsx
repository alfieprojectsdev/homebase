
'use client';

import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function ServiceWorkerRegistration() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Logic handled by next-pwa usually, but we need custom registration for Push
      // For now, let's just check if we can register ours or attach to existing
      // Actually, standard SW registration:
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('SW registered', reg);
          setRegistration(reg);
          reg.pushManager.getSubscription().then(sub => {
            if (sub) {
              setIsSubscribed(true);
              setSubscription(sub);
              // TODO: Sync with backend
            }
          });
        });
    }
  }, []);

  const subscribeButtonOnClick = async (event: any) => {
    event.preventDefault();
    if (!registration) return;

    if (!VAPID_PUBLIC_KEY) {
      console.error('No VAPID public key found');
      return;
    }

    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      console.log('Web Push Subscribed:', sub);
      setIsSubscribed(true);
      setSubscription(sub);

      // Send to backend
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      });
      alert('Subscribed to notifications!');

    } catch (error) {
      console.error('Failed to subscribe', error);
      alert('Failed to subscribe: ' + error);
    }
  };

  return (
    <div className="p-4 border rounded shadow bg-white mt-4">
      <h3 className="font-bold text-lg mb-2">Notifications</h3>
      {isSubscribed ? (
        <p className="text-green-600">✅ Active</p>
      ) : (
        <button
          onClick={subscribeButtonOnClick}
          className="bg-blue-600 text-white px-4 py-3 min-h-[44px] rounded hover:bg-blue-700"
        >
          Enable Push Notifications
        </button>
      )}
    </div>
  );
}
