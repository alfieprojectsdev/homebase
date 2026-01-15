'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProgressBar from '@/components/chores/ProgressBar';

interface Chore {
    id: number;
    title: string;
    description: string | null;
    assignedTo: string | null;
    dueDate: string | null;
    status: 'pending' | 'completed' | 'verified';
    priority: 'low' | 'medium' | 'high';
    progress: number;
}

export default function ChoresPage() {
    const [chores, setChores] = useState<Chore[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('ChoresPage: Mounted');
        fetchChores();
    }, []);

    const fetchChores = async () => {
        try {
            const response = await fetch('/api/chores');
            if (response.ok) {
                const data = await response.json();
                setChores(data.chores);
            }
        } catch (error) {
            console.error('Failed to fetch chores', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Chores</h1>
                <Link href="/chores/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Add Chore
                </Link>
            </div>

            {chores.length === 0 ? (
                <div className="text-gray-500">No chores found</div>
            ) : (
                <div className="grid gap-4">
                    {chores.map((chore) => (
                        <div key={chore.id} className="border p-4 rounded shadow-sm bg-white">
                            <div className="flex justify-between">
                                <h3 className="font-semibold">{chore.title}</h3>
                                <span className={`px-2 py-1 rounded text-sm ${chore.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                                    {chore.status}
                                </span>
                            </div>
                            <div className="mt-2">
                                <ProgressBar progress={chore.progress} choreTitle={chore.title} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
