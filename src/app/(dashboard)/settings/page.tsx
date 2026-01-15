
'use client';

import { useState } from 'react';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export default function SettingsPage() {
    const [phone, setPhone] = useState('');
    const [saving, setSaving] = useState(false);

    // Mock save for now
    const handleSavePhone = async () => {
        setSaving(true);
        // TODO: Connect to API
        setTimeout(() => {
            setSaving(false);
            alert('Phone number saved (mock)');
        }, 1000);
    };

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
                <div className="flex gap-4">
                    <input
                        type="tel"
                        className="border p-2 rounded flex-1"
                        placeholder="+1234567890"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    <button
                        onClick={handleSavePhone}
                        disabled={saving}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                    Used for emergency alerts only (e.g., hard deadlines with remote payment lockouts).
                </p>
            </div>
        </div>
    );
}
