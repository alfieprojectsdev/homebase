'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewChorePage() {
    const router = useRouter();
    const [title, setTitle] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch('/api/chores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, progress: 0 }),
        });
        router.push('/chores');
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">New Chore</h1>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                        type="text"
                        name="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                    />
                </div>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Create Chore
                </button>
            </form>
        </div>
    );
}
