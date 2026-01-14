'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    console.log('DashboardLayout: Mounted');
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) console.log('DashboardLayout: User loaded', user.email);
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch {
      console.error('Logout error');
    }

    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Homebase</h1>
            {loading ? (
              <div className="text-gray-700">Loading...</div>
            ) : user && (
              <div className="flex items-center gap-4">
                <span className="text-gray-700">{user.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                  style={{ minHeight: '44px', padding: '0.5rem 1rem' }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
