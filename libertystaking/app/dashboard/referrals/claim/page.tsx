'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAccount } from 'wagmi';
import { ContractService } from '@/lib/contracts';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';
import { DollarSign, Users, TrendingUp, Copy, Share2, RefreshCw } from 'lucide-react';

interface ReferralStats {
  level1Count: number;
  level2Count: number;
  level3Count: number;
  totalEarned: string;
  pending: string;
  claimed: string;
  level1Refs: string[];
}

export default function ClaimRewardsPage() {
  const { user } = useAuth();
  const { address } = useAccount();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({
    level1Count: 0,
    level2Count: 0,
    level3Count: 0,
    totalEarned: '0',
    pending: '0',
    claimed: '0',
    level1Refs: [],
  });

  useEffect(() => {
    if (address && window.ethereum) {
      fetchReferralStats();
    }
  }, [address]);

  const fetchReferralStats = async () => {
    if (!address || !window.ethereum) return;
    
    setRefreshing(true);
    try {
      const contractService = new ContractService(window.ethereum);
      const referralInfo = await contractService.getReferralInfo(address);
      
      setStats({
        level1Count: referralInfo.stats.level1Count,
        level2Count: referralInfo.stats.level2Count,
        level3Count: referralInfo.stats.level3Count,
        totalEarned: referralInfo.stats.totalEarned,
        pending: referralInfo.pending,
        claimed: referralInfo.claimed,
        level1Refs: referralInfo.level1,
      });

      console.log('📊 Referral Stats:', referralInfo);
    } catch (error) {
      console.error('Failed to fetch referral stats:', error);
      showError('Failed to load referral data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleClaim = async () => {
    if (!address || !window.ethereum) {
      showError('Please connect your wallet');
      return;
    }

    if (parseFloat(stats.pending) === 0) {
      showError('No pending rewards to claim');
      return;
    }

    setLoading(true);
    const loadingToast = showLoading('Claiming referral rewards...');

    try {
      const contractService = new ContractService(window.ethereum);
      const tx = await contractService.claimReferralRewards();
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Waiting for confirmation...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess(`Successfully claimed ${stats.pending} INRT! 🎉`);
      await fetchReferralStats();
    } catch (error: any) {
      dismissToast(loadingToast);
      console.error('Claim error:', error);
      if (error.code === 4001) {
        showError('Transaction rejected by user');
      } else {
        showError(error.message || 'Failed to claim rewards');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReferralLink = () => {
    const referralLink = `${window.location.origin}/signup?ref=${address}`;
    navigator.clipboard.writeText(referralLink);
    showSuccess('Referral link copied to clipboard!');
  };

  const handleWhatsAppShare = () => {
    const referralLink = `${window.location.origin}/signup?ref=${address}`;
    const message = `🚀 Join Liberty Finance and earn passive income!

I'm earning rewards by staking crypto. Join using my referral link and we both benefit!

💰 High APR rewards
🎁 Multi-level referral bonuses
🔒 Secure smart contracts

Join now: ${referralLink}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Claim Referral Rewards</h1>
          <p className="text-gray-600">Withdraw your earned referrer commissions</p>
        </div>
        
        <button
          onClick={fetchReferralStats}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Pending Rewards */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm opacity-90">Pending Rewards</h3>
            <DollarSign size={24} />
          </div>
          <p className="text-4xl font-bold">{parseFloat(stats.pending).toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">INRT</p>
        </div>

        {/* Total Claimed */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm opacity-90">Total Claimed</h3>
            <TrendingUp size={24} />
          </div>
          <p className="text-4xl font-bold">{parseFloat(stats.claimed).toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">INRT</p>
        </div>

        {/* Total Earned */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm opacity-90">Total Earned</h3>
            <Users size={24} />
          </div>
          <p className="text-4xl font-bold">{parseFloat(stats.totalEarned).toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">INRT</p>
        </div>
      </div>

      {/* Claim Section */}
      <div className="bg-white rounded-lg border p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Claim Your Rewards</h2>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-4">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Available to Claim</p>
            <p className="text-5xl font-bold text-green-600 mb-6">
              {parseFloat(stats.pending).toFixed(2)} INRT
            </p>
            
            <button
              onClick={handleClaim}
              disabled={loading || parseFloat(stats.pending) === 0}
              className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Claiming...
                </span>
              ) : (
                'Claim Referral Rewards'
              )}
            </button>
          </div>
        </div>

        {parseFloat(stats.pending) === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 text-center">
              💡 No pending rewards yet. Share your referral link to start earning!
            </p>
          </div>
        )}
      </div>

      {/* Referral Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-bold mb-4">Level 1</h3>
          <p className="text-4xl font-bold text-blue-600 mb-2">{stats.level1Count}</p>
          <p className="text-sm text-gray-600">Direct Referrals</p>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500">Earn from their stakes</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-bold mb-4">Level 2</h3>
          <p className="text-4xl font-bold text-purple-600 mb-2">{stats.level2Count}</p>
          <p className="text-sm text-gray-600">Indirect Referrals</p>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500">Referrals of your referrals</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-bold mb-4">Level 3+</h3>
          <p className="text-4xl font-bold text-green-600 mb-2">{stats.level3Count}</p>
          <p className="text-sm text-gray-600">Deep Network</p>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500">Extended network earnings</p>
          </div>
        </div>
      </div>

      {/* Share Referral Link */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Share Your Referral Link</h2>
        <p className="mb-6 opacity-90">Invite friends and earn commission on their stakes!</p>
        
        <div className="bg-white/10 backdrop-blur rounded-lg p-4 mb-4">
          <p className="text-sm opacity-90 mb-2">Your Referral Link:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${window.location.origin}/signup?ref=${address}`}
              readOnly
              className="flex-1 px-4 py-2 bg-white/20 rounded-lg text-white font-mono text-sm"
            />
            <button
              onClick={handleCopyReferralLink}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium"
            >
              <Copy size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleWhatsAppShare}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
          >
            <Share2 size={20} />
            Share on WhatsApp
          </button>
          
          <button
            onClick={handleCopyReferralLink}
            className="flex-1 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium flex items-center justify-center gap-2"
          >
            <Copy size={20} />
            Copy Link
          </button>
        </div>
      </div>

      {/* Level 1 Referrals List */}
      {stats.level1Refs.length > 0 && (
        <div className="mt-8 bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-4">Your Direct Referrals ({stats.level1Count})</h2>
          <div className="space-y-2">
            {stats.level1Refs.map((ref, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-mono text-sm">{ref}</p>
                </div>
                <a
                  href={`https://testnet.snowtrace.io/address/${ref}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
