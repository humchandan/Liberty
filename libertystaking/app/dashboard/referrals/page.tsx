'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Users, DollarSign, Copy, CheckCircle, Link as LinkIcon } from 'lucide-react';

interface ReferralStats {
  totalTeamSize: number;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  activeMembers: number;
  inactiveMembers: number;
  earnings: {
    totalEarned: string;
    totalClaimed: string;
    pendingClaims: string;
    canClaim: boolean;
    minClaimAmount: string;
  };
}

interface Earning {
  earningId: number;
  refereeWallet: string;
  level: number;
  amount: string;
  percentage: number;
  investmentAmount: string;
  claimed: boolean;
  earnedAt: string;
  txHash: string;
}

export default function ReferralsPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchEarnings();
    }
  }, [token]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/v1/referrals/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/referrals/earnings?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setEarnings(data.earnings);
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?ref=${user?.customReferralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Referral Program</h1>
        <p className="text-gray-600">Earn up to 15% commission on 15 levels</p>
      </div>

      {/* Referral Link Card */}
      <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon size={24} />
          <h2 className="text-xl font-bold">Your Referral Link</h2>
        </div>
        <div className="bg-white/20 rounded-lg p-4 flex items-center justify-between gap-4">
          <code className="text-sm break-all">
            {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?ref={user?.customReferralCode}
          </code>
          <button
            onClick={copyReferralLink}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium whitespace-nowrap"
          >
            {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-sm mt-3 opacity-90">
          Share this link with friends and earn commission on their investments!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-600">Total Team</h3>
            <Users className="text-blue-600" size={24} />
          </div>
          <p className="text-3xl font-bold">{stats?.totalTeamSize || 0}</p>
          <p className="text-sm text-gray-600 mt-2">
            Active: {stats?.activeMembers || 0} | Inactive: {stats?.inactiveMembers || 0}
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-600">Total Earned</h3>
            <DollarSign className="text-green-600" size={24} />
          </div>
          <p className="text-3xl font-bold">{parseFloat(stats?.earnings.totalEarned || '0').toFixed(2)} INRT</p>
          <p className="text-sm text-gray-600 mt-2">
            Claimed: {parseFloat(stats?.earnings.totalClaimed || '0').toFixed(2)} INRT
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-600">Pending Claims</h3>
            <DollarSign className="text-orange-600" size={24} />
          </div>
          <p className="text-3xl font-bold">{parseFloat(stats?.earnings.pendingClaims || '0').toFixed(2)} INRT</p>
          {stats?.earnings.canClaim ? (
            <button className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
              Claim Now
            </button>
          ) : (
            <p className="text-sm text-gray-600 mt-2">
              Min. {stats?.earnings.minClaimAmount} INRT required
            </p>
          )}
        </div>
      </div>

      {/* Level Breakdown */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Team by Level</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{stats?.level1Count || 0}</p>
            <p className="text-sm text-gray-600">Level 1</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{stats?.level2Count || 0}</p>
            <p className="text-sm text-gray-600">Level 2</p>
          </div>
          <div className="text-center p-4 bg-pink-50 rounded-lg">
            <p className="text-2xl font-bold text-pink-600">{stats?.level3Count || 0}</p>
            <p className="text-sm text-gray-600">Level 3</p>
          </div>
        </div>
      </div>

      {/* Recent Earnings */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4">Recent Earnings</h2>
        
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : earnings.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No earnings yet. Start referring!</p>
        ) : (
          <div className="space-y-3">
            {earnings.map((earning) => (
              <div
                key={earning.earningId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">Level {earning.level} Commission</p>
                  <p className="text-sm text-gray-600">
                    From: {earning.refereeWallet.slice(0, 6)}...{earning.refereeWallet.slice(-4)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(earning.earnedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">+{earning.amount} INRT</p>
                  <p className="text-sm text-gray-600">{earning.percentage}%</p>
                  {earning.claimed && (
                    <span className="text-xs text-green-600">✓ Claimed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
