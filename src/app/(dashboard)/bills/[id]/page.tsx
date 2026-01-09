'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getAuthHeaders } from '@/lib/auth/headers';

interface Bill {
  id: number;
  name: string;
  amount: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
}

export default function BillPage() {
  const router = useRouter();
  const params = useParams();
  const billId = params.id as string;
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const response = await fetch(`/api/bills/${billId}`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch bill');
        }

        setBill(data.bill);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bill');
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [billId]);

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

  const handlePay = async () => {
    try {
      const response = await fetch(`/api/bills/${billId}/pay`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to mark bill as paid');
      }

      const getResponse = await fetch(`/api/bills/${billId}`, {
        headers: getAuthHeaders(),
      });
      const getData = await getResponse.json();
      setBill(getData.bill);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pay bill');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error || 'Bill not found'}</div>
          <Link href="/bills" className="text-indigo-600 hover:text-indigo-800 text-lg font-medium">
            Back to Bills
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/bills"
            className="text-indigo-600 hover:text-indigo-800 text-lg font-medium"
          >
            ← Back to Bills
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className={`border-2 rounded-lg p-8 ${getUrgencyColor(bill)}`}>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{bill.name}</h1>
              <p className="text-2xl font-semibold mb-1">{formatCurrency(bill.amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-medium mb-1">{formatDate(bill.dueDate)}</p>
              <p className="text-sm mt-1">{getDaysUntilDueText(bill.dueDate, bill.status)}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-lg font-medium mb-2">Status</div>
            <div className="text-lg">
              {bill.status === 'paid' ? (
                <span className="text-green-800 font-semibold">✅ Paid</span>
              ) : bill.status === 'overdue' ? (
                <span className="text-red-800 font-semibold">⚠️ Overdue</span>
              ) : (
                <span className="text-orange-800 font-semibold">📅 Pending</span>
              )}
            </div>
          </div>

          {bill.status === 'pending' && (
            <div className="flex gap-3">
              <button
                onClick={handlePay}
                className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
                style={{ minHeight: '44px' }}
              >
                Mark as Paid
              </button>
              <Link
                href={`/bills/${billId}/edit`}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                style={{ minHeight: '44px' }}
              >
                Edit Bill
              </Link>
            </div>
          )}

          {bill.status === 'paid' && (
            <div>
              <div className="text-green-800 font-semibold mb-2">✅ This bill has been paid</div>
              <Link
                href={`/bills/${billId}/edit`}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors inline-block"
                style={{ minHeight: '44px' }}
              >
                Edit Details
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}