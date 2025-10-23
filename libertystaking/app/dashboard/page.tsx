'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/dashboard/Navbar';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Wallet, TrendingUp, Users, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalInvested: string;
  activeInvestments: number;
  referralEarnings: {
    total: string;
    claimable: string;
    claimed: string;
  };
  teamStats: {
    totalSize: number;
    activeMembers: number;
  };
}

export default function DashboardPage() {
  const { user, isAuthenticated, token, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/users/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Dashboard</h2>
          {user && (
            <p className="text-gray-600 mt-2">
              Welcome back, {user.fullName || 'User'}!
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Invested"
            value={`${parseFloat(stats?.totalInvested || '0').toFixed(2)} INRT`}
            icon={<Wallet size={24} />}
          />
          
          <StatsCard
            title="Active Investments"
            value={stats?.activeInvestments || 0}
            icon={<TrendingUp size={24} />}
          />
          
          <StatsCard
            title="Referral Earnings"
            value={`${parseFloat(stats?.referralEarnings.total || '0').toFixed(2)} INRT`}
            icon={<DollarSign size={24} />}
          />
          
          <StatsCard
            title="Team Size"
            value={stats?.teamStats.totalSize || 0}
            icon={<Users size={24} />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-xl font-bold mb-4">Recent Investments</h3>
            <p className="text-gray-600">No investments yet</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Create Investment
            </button>
          </div>
          
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-xl font-bold mb-4">Referral Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Earned:</span>
                <span className="font-bold">{parseFloat(stats?.referralEarnings.total || '0').toFixed(2)} INRT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Claimable:</span>
                <span className="font-bold text-green-600">{parseFloat(stats?.referralEarnings.claimable || '0').toFixed(2)} INRT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Claimed:</span>
                <span className="font-bold">{parseFloat(stats?.referralEarnings.claimed || '0').toFixed(2)} INRT</span>
              </div>
            </div>
            {parseFloat(stats?.referralEarnings.claimable || '0') >= 500 && (
              <button className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Claim Rewards
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
