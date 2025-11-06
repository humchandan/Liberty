'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Users, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { useAccount } from 'wagmi';

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

export default function ClaimRewardsPage() {
  const { token } = useAuth();
  const { address } = useAccount();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [selectedToken, setSelectedToken] = useState<'INRT' | 'USDT'>('INRT');

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Dynamic claim with token selection
  const handleClaim = async () => {
    if (!address || !stats?.earnings.canClaim) return;

    setClaiming(true);
    try {
      const res = await fetch('/api/v1/referrals/claim', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenSymbol: selectedToken,  // ✅ Dynamic based on user selection
          txHash: 'backend_claim'      // ✅ Dummy txHash
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Successfully claimed ${data.claimed.amount} ${data.claimed.tokenSymbol}!`);
        await fetchStats();
      } else {
        alert(`Claim failed: ${data.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Claim error:', error);
      alert(`Claim failed: ${error.message}`);
    } finally {
      setClaiming(false);
    }
  };

  const pendingAmount = parseFloat(stats?.earnings.pendingClaims || '0');
  const totalEarned = parseFloat(stats?.earnings.totalEarned || '0');
  const totalClaimed = parseFloat(stats?.earnings.totalClaimed || '0');
  const canClaim = stats?.earnings.canClaim || false;
  const minAmount = selectedToken === 'INRT' ? 500 : 100;

  return (
    <DashboardLayout>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Claim Rewards</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Claim your referral earnings • Minimum: {minAmount} {selectedToken}
        </p>
      </div>

      {/* ✅ Token Selector */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
          <button
            onClick={() => setSelectedToken('INRT')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedToken === 'INRT'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            INRT
          </button>
          <button
            onClick={() => setSelectedToken('USDT')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedToken === 'USDT'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            USDT
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Main Claim Card */}
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 sm:p-8 text-white mb-6 shadow-lg">
            <div className="text-center mb-6">
              <p className="text-sm sm:text-base opacity-90 mb-2">Available to Claim</p>
              <p className="text-4xl sm:text-5xl font-bold mb-4">
                {pendingAmount.toFixed(2)} {selectedToken}
              </p>
              
              {canClaim && pendingAmount >= minAmount ? (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                >
                  {claiming ? 'Processing Claim...' : `Claim ${pendingAmount.toFixed(2)} ${selectedToken}`}
                </button>
              ) : (
                <div className="bg-white/20 rounded-lg p-4">
                  <AlertCircle className="mx-auto mb-2" size={24} />
                  <p className="text-sm">
                    Minimum {minAmount} {selectedToken} required to claim
                  </p>
                  {pendingAmount > 0 && pendingAmount < minAmount && (
                    <p className="text-xs opacity-75 mt-1">
                      You need {(minAmount - pendingAmount).toFixed(2)} more {selectedToken}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Progress to minimum */}
            {pendingAmount < minAmount && pendingAmount > 0 && (
              <div className="mt-4">
                <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-white h-full rounded-full transition-all"
                    style={{ width: `${Math.min((pendingAmount / minAmount) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-center mt-2 opacity-75">
                  {((pendingAmount / minAmount) * 100).toFixed(1)}% of minimum reached
                </p>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
            <div className="bg-white rounded-lg border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-600 text-sm">Total Team</h3>
                <Users className="text-blue-600" size={20} />
              </div>
              <p className="text-3xl font-bold">{stats?.totalTeamSize || 0}</p>
              <p className="text-xs text-gray-600 mt-2">
                Active: {stats?.activeMembers || 0} | Inactive: {stats?.inactiveMembers || 0}
              </p>
            </div>

            <div className="bg-white rounded-lg border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-600 text-sm">Total Earned</h3>
                <TrendingUp className="text-green-600" size={20} />
              </div>
              <p className="text-3xl font-bold">{totalEarned.toFixed(2)} {selectedToken}</p>
              <p className="text-xs text-gray-600 mt-2">Lifetime earnings</p>
            </div>

            <div className="bg-white rounded-lg border p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-600 text-sm">Already Claimed</h3>
                <DollarSign className="text-green-600" size={20} />
              </div>
              <p className="text-3xl font-bold">{totalClaimed.toFixed(2)} {selectedToken}</p>
              <p className="text-xs text-gray-600 mt-2">Successfully withdrawn</p>
            </div>
          </div>

          {/* Level Breakdown */}
          <div className="bg-white rounded-lg border p-6 mb-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Team by Level</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats?.level1Count || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Level 1</p>
                <p className="text-xs text-gray-500 mt-1">3% commission</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{stats?.level2Count || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Level 2</p>
                <p className="text-xs text-gray-500 mt-1">1.5% commission</p>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-lg">
                <p className="text-2xl font-bold text-pink-600">{stats?.level3Count || 0}</p>
                <p className="text-sm text-gray-600 mt-1">Level 3</p>
                <p className="text-xs text-gray-500 mt-1">0.5% commission</p>
              </div>
            </div>
          </div>

          {/* How to Earn More */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-3 text-gray-900">💡 How to Earn More</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>✓ Share your referral link with friends and earn 3% on their {selectedToken} investments</p>
              <p>✓ Earn 1.5% on Level 2 referrals (referrals of your referrals)</p>
              <p>✓ Earn 0.5% on Level 3 referrals (third-level network)</p>
              <p className="mt-4 font-medium">
                📊 Your current pending: <span className="text-blue-600">{pendingAmount.toFixed(2)} {selectedToken}</span>
                {pendingAmount < minAmount && pendingAmount > 0 && (
                  <> • Need {(minAmount - pendingAmount).toFixed(2)} more to claim</>
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
