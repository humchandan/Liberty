'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Users, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminStats {
  users: {
    total: number;
    active: number;
    recentSignups: number;
  };
  investments: {
    total: number;
    active: number;
    totalStaked: string;
    activeValue: string;
  };
  referrals: {
    totalEarnings: string;
    totalClaimed: string;
    pending: string;
  };
}

export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }

    if (token) {
      fetchAdminStats();
    }
  }, [token, isAdmin, router]);

  const fetchAdminStats = async () => {
    try {
      const res = await fetch('/api/v1/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      
      if (data.success) {
        setStats(data.dashboard);
      } else {
        setError(data.error?.message || 'Failed to load admin stats');
      }
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <h2 className="font-bold mb-2">Access Denied</h2>
          <p>{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Platform overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-600">Total Users</h3>
            <Users className="text-blue-600" size={24} />
          </div>
          <p className="text-3xl font-bold">{stats?.users.total || 0}</p>
          <p className="text-sm text-gray-600 mt-2">
            Active: {stats?.users.active || 0}
          </p>
          <p className="text-sm text-green-600 mt-1">
            +{stats?.users.recentSignups || 0} this month
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-600">Total Investments</h3>
            <TrendingUp className="text-green-600" size={24} />
          </div>
          <p className="text-3xl font-bold">{stats?.investments.total || 0}</p>
          <p className="text-sm text-gray-600 mt-2">
            Active: {stats?.investments.active || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-600">Total Staked</h3>
            <DollarSign className="text-purple-600" size={24} />
          </div>
          <p className="text-3xl font-bold">{parseFloat(stats?.investments.totalStaked || '0').toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-2">INRT</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-600">Referral Earnings</h3>
            <Activity className="text-orange-600" size={24} />
          </div>
          <p className="text-3xl font-bold">{parseFloat(stats?.referrals.totalEarnings || '0').toFixed(2)}</p>
          <p className="text-sm text-gray-600 mt-2">
            Pending: {parseFloat(stats?.referrals.pending || '0').toFixed(2)} INRT
          </p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4">User Statistics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Total Registered</span>
              <span className="text-2xl font-bold">{stats?.users.total || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Active Users</span>
              <span className="text-2xl font-bold text-green-600">{stats?.users.active || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Recent Signups (30d)</span>
              <span className="text-2xl font-bold text-blue-600">{stats?.users.recentSignups || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4">Investment Overview</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Total Investments</span>
              <span className="text-2xl font-bold">{stats?.investments.total || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Active Investments</span>
              <span className="text-2xl font-bold text-green-600">{stats?.investments.active || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Value</span>
              <span className="text-2xl font-bold text-purple-600">
                {parseFloat(stats?.investments.activeValue || '0').toFixed(2)} INRT
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">Referral System</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {parseFloat(stats?.referrals.totalEarnings || '0').toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2">Total Earnings (INRT)</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">
                {parseFloat(stats?.referrals.totalClaimed || '0').toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2">Total Claimed (INRT)</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <p className="text-3xl font-bold text-orange-600">
                {parseFloat(stats?.referrals.pending || '0').toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-2">Pending (INRT)</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
