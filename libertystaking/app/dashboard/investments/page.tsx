'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Clock, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Investment {
  investmentId: number;
  orderId: number;
  tokenSymbol: string;
  totalAmount: string;
  orderCount: number;
  amountPerOrder: string;
  lockedApr: number;
  stakeDate: string;
  maturityDate: string;
  maturityCountdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isMatured: boolean;
  };
  status: string;
  paidOrderCount: number;
  remainingOrders: number;
  expectedInterest: string;
  expectedPayout: string;
  fullyPaid: boolean;
  txHash: string;
}

export default function InvestmentsPage() {
  const { token } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (token) {
      fetchInvestments();
    }
  }, [token, filter]);

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/investments?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setInvestments(data.investments);
      }
    } catch (error) {
      console.error('Failed to fetch investments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'matured': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">My Investments</h1>
        
        {/* Filter Tabs */}
        <div className="flex gap-2 border-b">
          {['all', 'active', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`px-4 py-2 font-medium capitalize ${
                filter === tab
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : investments.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <TrendingUp className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Investments Yet</h3>
          <p className="text-gray-600 mb-6">Start staking INRT tokens to earn rewards</p>
          <Link
  href="/dashboard/investments/create"
  className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
>
  Create Investment
</Link>

        </div>
      ) : (
        <div className="space-y-4">
          {investments.map((investment) => (
            <div
              key={investment.investmentId}
              className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">
                      {investment.totalAmount} {investment.tokenSymbol}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}>
                      {investment.status}
                    </span>
                  </div>
                  <p className="text-gray-600">Order #{investment.orderId}</p>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{investment.lockedApr}% APR</p>
                  <p className="text-sm text-gray-600">Expected: {investment.expectedPayout} INRT</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar size={16} /> Staked On
                  </p>
                  <p className="font-medium">{new Date(investment.stakeDate).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock size={16} /> Maturity
                  </p>
                  <p className="font-medium">{new Date(investment.maturityDate).toLocaleDateString()}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Orders</p>
                  <p className="font-medium">{investment.paidOrderCount} / {investment.orderCount}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Per Order</p>
                  <p className="font-medium">{investment.amountPerOrder} INRT</p>
                </div>
              </div>

              {!investment.maturityCountdown.isMatured && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Time to Maturity:</p>
                  <div className="flex gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{investment.maturityCountdown.days}</p>
                      <p className="text-xs text-gray-600">Days</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{investment.maturityCountdown.hours}</p>
                      <p className="text-xs text-gray-600">Hours</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{investment.maturityCountdown.minutes}</p>
                      <p className="text-xs text-gray-600">Minutes</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <a
                  href={`https://testnet.snowtrace.io/tx/${investment.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View Transaction →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
