
'use client';

import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export default function SettingsPage() {
    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">Notifications</h2>
                <p className="text-gray-600 mb-4">Enable browser notifications to ensure you never miss a bill.</p>
                <ServiceWorkerRegistration />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Contact Info (SMS Fallback)</h2>
                <div className="flex gap-4 items-center">
                    <input
                        type="tel"
                        className="border p-2 rounded flex-1 bg-gray-100 cursor-not-allowed"
                        placeholder="+1234567890"
                        disabled
                    />
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded text-sm font-medium">
                        Coming Soon
                    </span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    SMS notifications for emergency alerts will be available in a future update.
                </p>
            </div>
        </div>
    );
}
