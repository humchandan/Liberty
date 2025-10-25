'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Clock, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Investment {
  investmentId: number;
  orderId: number | null;
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

// ✅ Countdown Timer Component (with seconds!)
function CountdownTimer({ maturityDate }: { maturityDate: string }) {
  const [timeRemaining, setTimeRemaining] = useState({ 
    days: 0, 
    hours: 0, 
    minutes: 0, 
    seconds: 0 
  });

  useEffect(() => {
    const targetDate = new Date(maturityDate);
    
    const updateCountdown = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [maturityDate]);

  return (
    <div className="flex gap-4">
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900">{timeRemaining.days}</div>
        <div className="text-xs text-gray-600 uppercase tracking-wide">Days</div>
      </div>
      <div className="text-3xl font-bold text-gray-400">:</div>
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900">{timeRemaining.hours}</div>
        <div className="text-xs text-gray-600 uppercase tracking-wide">Hours</div>
      </div>
      <div className="text-3xl font-bold text-gray-400">:</div>
      <div className="text-center">
        <div className="text-3xl font-bold text-gray-900">{timeRemaining.minutes}</div>
        <div className="text-xs text-gray-600 uppercase tracking-wide">Minutes</div>
      </div>
      <div className="text-3xl font-bold text-gray-400">:</div>
      <div className="text-center">
        <div className="text-3xl font-bold text-blue-600">{timeRemaining.seconds}</div>
        <div className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Seconds</div>
      </div>
    </div>
  );
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
          <p className="text-gray-600 mb-6">Start staking tokens to earn rewards</p>
          <Link
            href="/dashboard/investments/create"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
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
                      {parseFloat(investment.totalAmount).toFixed(2)} {investment.tokenSymbol}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(investment.status)}`}>
                      {investment.status}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    {investment.orderId ? `Order #${investment.orderId}` : 'Processing...'}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{investment.lockedApr}% APR</p>
                  <p className="text-sm text-gray-600">
                    Expected: {parseFloat(investment.expectedPayout).toFixed(2)} {investment.tokenSymbol}
                  </p>
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
                  <p className="font-medium">
                    {parseFloat(investment.amountPerOrder).toFixed(2)} {investment.tokenSymbol}
                  </p>
                </div>
              </div>

              {!investment.maturityCountdown.isMatured && (
                <div className="mb-4 bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm text-gray-600 mb-3 font-medium">Time to Maturity</h3>
                  <CountdownTimer maturityDate={investment.maturityDate} />
                </div>
              )}

              {investment.maturityCountdown.isMatured && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">
                    ✅ Investment Matured! Ready for withdrawal
                  </p>
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

      {/* Create New Investment Button (Fixed Position) */}
      {investments.length > 0 && (
        <div className="fixed bottom-8 right-8">
          <Link
            href="/dashboard/investments/create"
            className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all"
          >
            <DollarSign size={20} />
            <span className="font-medium">New Investment</span>
          </Link>
        </div>
      )}
    </DashboardLayout>
  );
}
