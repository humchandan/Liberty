'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DollarSign, TrendingUp, Wallet, RefreshCw, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ContractService } from '@/lib/contracts';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';

export default function TreasuryPage() {
  const { user } = useAuth();
  const { address } = useAccount();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [treasuryData, setTreasuryData] = useState({
    balance: '0',
    totalStaked: '0',
    totalPaid: '0',
    pendingPayouts: 0,
  });

  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (address && window.ethereum) {
      fetchTreasuryData();
    }
  }, [isAdmin, address, router]);

  const fetchTreasuryData = async () => {
    if (!window.ethereum) return;

    setLoading(true);
    try {
      const contractService = new ContractService(window.ethereum);
      const stats = await contractService.getPlatformStats();
      
      setTreasuryData({
        balance: stats.treasury,
        totalStaked: stats.totalStaked,
        totalPaid: stats.totalPaid,
        pendingPayouts: stats.pendingPayouts,
      });
    } catch (error) {
      console.error('Failed to fetch treasury ', error);
      showError('Failed to fetch treasury data');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Treasury Management</h1>
            <p className="text-gray-600">Monitor and manage platform treasury</p>
          </div>
          
          <button
            onClick={fetchTreasuryData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-linear-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Treasury Balance</h3>
            <Wallet size={24} />
          </div>
          <p className="text-4xl font-bold">{parseFloat(treasuryData.balance).toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">INRT</p>
        </div>

        <div className="bg-linear-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Total Staked</h3>
            <TrendingUp size={24} />
          </div>
          <p className="text-4xl font-bold">{parseFloat(treasuryData.totalStaked).toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">INRT</p>
        </div>

        <div className="bg-linear-to-br from-purple-600 to-purple-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Total Paid</h3>
            <DollarSign size={24} />
          </div>
          <p className="text-4xl font-bold">{parseFloat(treasuryData.totalPaid).toFixed(2)}</p>
          <p className="text-sm opacity-90 mt-1">INRT</p>
        </div>

        <div className="bg-linear-to-br from-orange-600 to-orange-700 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium opacity-90">Pending Payouts</h3>
            <Package size={24} />
          </div>
          <p className="text-4xl font-bold">{treasuryData.pendingPayouts}</p>
          <p className="text-sm opacity-90 mt-1">Orders</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-xl font-bold mb-4">Treasury Actions</h2>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ Treasury management functions are view-only. Contract funds are managed by smart contract logic.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
