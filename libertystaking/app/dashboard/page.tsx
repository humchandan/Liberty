'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Wallet, TrendingUp, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';

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
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        {user && (
          <p className="text-gray-600 mt-2">
            Welcome back, <span className="font-medium">{user.fullName || 'User'}</span>!
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
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/investments"
              className="block w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center font-medium"
            >
              View Investments
            </Link>
            <Link
              href="/dashboard/referrals"
              className="block w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-center font-medium"
            >
              Manage Referrals
            </Link>
            <Link
              href="/dashboard/profile"
              className="block w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-center font-medium"
            >
              Edit Profile
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4">Referral Stats</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Earned:</span>
              <span className="font-bold text-lg">{parseFloat(stats?.referralEarnings.total || '0').toFixed(2)} INRT</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Claimable:</span>
              <span className="font-bold text-lg text-green-600">{parseFloat(stats?.referralEarnings.claimable || '0').toFixed(2)} INRT</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Claimed:</span>
              <span className="font-bold text-lg">{parseFloat(stats?.referralEarnings.claimed || '0').toFixed(2)} INRT</span>
            </div>
            {parseFloat(stats?.referralEarnings.claimable || '0') >= 500 && (
              <button className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                Claim Rewards
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
