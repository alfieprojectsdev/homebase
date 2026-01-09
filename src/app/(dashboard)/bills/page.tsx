'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/auth/headers';

interface Bill {
  id: number;
  name: string;
  amount: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
}

export default function BillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');



  const fetchBills = async () => {
    try {
      const response = await fetch('/api/bills', {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bills');
      }

      setBills(data.bills);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePay = async (id: number) => {
    try {
      const response = await fetch(`/api/bills/${id}/pay`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to mark bill as paid');
      }

      fetchBills();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pay bill');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bill?')) {
      return;
    }

    try {
      const response = await fetch(`/api/bills/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete bill');
      }

      fetchBills();
    } catch {
      setError('Failed to delete bill');
    }
  };

  const getUrgencyColor = (bill: Bill) => {
    if (bill.status === 'paid') {
      return 'bg-green-100 border-green-200 text-green-800';
    }

    const dueDate = new Date(bill.dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return 'bg-red-600 border-red-700 text-white';
    } else if (daysUntilDue <= 3) {
      return 'bg-orange-500 border-orange-600 text-white';
    } else if (daysUntilDue <= 7) {
      return 'bg-yellow-400 border-yellow-500 text-gray-900';
    }

    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const getDaysUntilDueText = (dueDate: string, status: string) => {
    if (status === 'paid') {
      return 'Paid';
    }

    const date = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return `${Math.abs(daysUntilDue)} days overdue`;
    } else if (daysUntilDue === 0) {
      return 'Due today';
    } else if (daysUntilDue === 1) {
      return 'Due tomorrow';
    }

    return `Due in ${daysUntilDue} days`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bills</h1>
          <Link
            href="/bills/new"
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            style={{ minHeight: '44px' }}
          >
            Add Bill
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {bills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No bills yet. Add your first bill!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className={`border-2 rounded-lg p-6 ${getUrgencyColor(bill)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{bill.name}</h3>
                    <p className="text-lg font-semibold">{formatCurrency(bill.amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatDate(bill.dueDate)}</p>
                    <p className="text-sm mt-1">{getDaysUntilDueText(bill.dueDate, bill.status)}</p>
                  </div>
                </div>

                {bill.status === 'pending' && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handlePay(bill.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 transition-colors"
                      style={{ minHeight: '44px' }}
                    >
                      Mark as Paid
                    </button>
                    <button
                      onClick={() => router.push(`/bills/${bill.id}/edit`)}
                      className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                      style={{ minHeight: '44px' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(bill.id)}
                      className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition-colors"
                      style={{ minHeight: '44px' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
