'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DollarSign, TrendingUp, Users, RefreshCw } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ContractService } from '@/lib/contracts';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';

export default function ClaimReferralPage() {
  const { user, token } = useAuth();
  const { address } = useAccount();
  
  const [loading, setLoading] = useState(false);
  const [referralEarnings, setReferralEarnings] = useState({
    pending: '0',
    claimed: '0',
    stats: {
      level1Count: 0,
      level2Count: 0,
      level3Count: 0,
      totalEarned: '0',
    },
  });

  useEffect(() => {
    if (address && window.ethereum) {
      fetchReferralEarnings();
    }
  }, [address]);

  const fetchReferralEarnings = async () => {
    if (!address || !window.ethereum) return;

    try {
      const contractService = new ContractService(window.ethereum);
      const earnings = await contractService.getReferralInfo(address);
      setReferralEarnings(earnings);
    } catch (error) {
      console.error('Failed to fetch referral earnings:', error);
    }
  };

  const handleClaim = async () => {
    if (!address || !window.ethereum) {
      showError('Please connect your wallet');
      return;
    }

    if (parseFloat(referralEarnings.pending) === 0) {
      showError('No pending referral rewards to claim');
      return;
    }

    setLoading(true);
    const loadingToast = showLoading('Claiming referral rewards...');

    try {
      const contractService = new ContractService(window.ethereum);
      
      const tx = await contractService.claimReferralRewards();
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Waiting for confirmation...');
      const receipt = await tx.wait();
      dismissToast(waitToast);
      
      showSuccess(`Successfully claimed ${referralEarnings.pending} INRT!`);
      
      // Refresh earnings
      await fetchReferralEarnings();
    } catch (error: any) {
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

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Claim Referral Rewards</h1>
            <p className="text-gray-600">Withdraw your earned referral commissions</p>
          </div>
          
          <button
            onClick={fetchReferralEarnings}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Pending Rewards</h3>
            <DollarSign size={24} />
          </div>
          <p className="text-4xl font-bold">{parseFloat(referralEarnings.pending).toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">INRT</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Total Claimed</h3>
            <TrendingUp size={24} />
          </div>
          <p className="text-4xl font-bold">{parseFloat(referralEarnings.claimed).toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">INRT</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Total Earned</h3>
            <Users size={24} />
          </div>
          <p className="text-4xl font-bold">{parseFloat(referralEarnings.stats.totalEarned).toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">INRT</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-6">Claim Your Rewards</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2">Available to Claim</h3>
            <p className="text-3xl font-bold text-green-600">{parseFloat(referralEarnings.pending).toFixed(2)} INRT</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2">Referral Stats</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600">Level 1</p>
                <p className="text-lg font-bold">{referralEarnings.stats.level1Count}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Level 2</p>
                <p className="text-lg font-bold">{referralEarnings.stats.level2Count}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Level 3</p>
                <p className="text-lg font-bold">{referralEarnings.stats.level3Count}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleClaim}
            disabled={loading || parseFloat(referralEarnings.pending) === 0}
            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
    </DashboardLayout>
  );
}
