'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ContractService } from '@/lib/contracts';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Pause, 
  Play, 
  RefreshCw,
  Settings,
  AlertCircle
} from 'lucide-react';

export default function AdminControlsPage() {
  const { user, token } = useAuth();
  const { address } = useAccount();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [currentAPR, setCurrentAPR] = useState<number>(0);
  const [currentMaturity, setCurrentMaturity] = useState<number>(0);
  const [currentCommission, setCurrentCommission] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // ✅ Admin fee state
  const [adminFees, setAdminFees] = useState('0');
  const [adminType, setAdminType] = useState<'primary' | 'secondary' | null>(null);
  
  // Form states
  const [newAPR, setNewAPR] = useState<string>('');
  const [newMaturity, setNewMaturity] = useState<string>('');
  const [newCommission, setNewCommission] = useState<string>('');

  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (address && window.ethereum) {
      fetchContractInfo();
    }
  }, [isAdmin, address, router]);

  const fetchContractInfo = async () => {
    if (!window.ethereum || !address) return;
    
    try {
      const contractService = new ContractService(window.ethereum);
      const stakingContract = contractService.getStakingContract();
      
      const [apr, maturity, commission, paused, adminInfo] = await Promise.all([
        stakingContract.currentAPR(),
        stakingContract.currentMaturityDuration(),
        stakingContract.adminCommissionPercentage(),
        stakingContract.stakingPaused(),
        contractService.getAdminFeesForConnectedWallet(address), // ✅ Auto-detect admin type
      ]);
      
      setCurrentAPR(apr.toNumber() / 100);
      setCurrentMaturity(maturity.toNumber());
      setCurrentCommission(commission.toNumber() / 100);
      setIsPaused(paused);
      setAdminFees(adminInfo.availableFees); // ✅ Set admin fees
      setAdminType(adminInfo.adminType); // ✅ Set admin type
      
      console.log('🔑 Admin Type:', adminInfo.adminType);
      console.log('💰 Available Fees:', adminInfo.availableFees);
    } catch (error) {
      console.error('Failed to fetch contract info:', error);
    }
  };

  // ✅ NEW: Handle admin fee claim
  const handleClaimAdminFees = async () => {
    if (!window.ethereum || !address) {
      showError('Please connect your wallet');
      return;
    }
    
    if (parseFloat(adminFees) === 0) {
      showError('No fees available to claim');
      return;
    }
    
    if (!adminType) {
      showError('Connected wallet is not an admin');
      return;
    }

    setLoading(true);
    const loadingToast = showLoading(`Claiming ${adminType} admin fees...`);

    try {
      const contractService = new ContractService(window.ethereum);
      const tx = await contractService.claimAdminFeesAuto(address); // ✅ Auto-claim
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Waiting for confirmation...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess(`Successfully claimed ${adminFees} INRT!`);
      await fetchContractInfo();
    } catch (error: any) {
      dismissToast(loadingToast);
      console.error('Claim error:', error);
      if (error.code === 4001) {
        showError('Transaction rejected by user');
      } else {
        showError(error.message || 'Failed to claim fees');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAPR = async () => {
    if (!newAPR || parseFloat(newAPR) <= 0) {
      showError('Please enter a valid APR');
      return;
    }

    setLoading(true);
    const loadingToast = showLoading('Updating APR...');

    try {
      const contractService = new ContractService(window.ethereum);
      const stakingContract = contractService.getStakingContract();
      
      const aprBasisPoints = Math.floor(parseFloat(newAPR) * 100);
      
      const tx = await stakingContract.setAPR(aprBasisPoints);
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Waiting for confirmation...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess(`APR updated to ${newAPR}%`);
      setNewAPR('');
      await fetchContractInfo();
    } catch (error: any) {
      console.error('APR update error:', error);
      showError(error.message || 'Failed to update APR');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerNewEpoch = async () => {
    setLoading(true);
    const loadingToast = showLoading('Triggering new epoch...');

    try {
      const contractService = new ContractService(window.ethereum);
      const tx = await contractService.triggerNewEpoch();
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Waiting for confirmation...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess('New epoch triggered successfully!');
    } catch (error: any) {
      console.error('Epoch trigger error:', error);
      showError(error.message || 'Failed to trigger new epoch');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMaturity = async () => {
    if (!newMaturity || parseInt(newMaturity) <= 0) {
      showError('Please enter a valid maturity duration');
      return;
    }

    setLoading(true);
    const loadingToast = showLoading('Updating maturity duration...');

    try {
      const contractService = new ContractService(window.ethereum);
      const stakingContract = contractService.getStakingContract();
      
      const durationInSeconds = parseInt(newMaturity) * 24 * 60 * 60;
      
      const tx = await stakingContract.setMaturityDuration(durationInSeconds);
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Waiting for confirmation...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess(`Maturity duration updated to ${newMaturity} days`);
      setNewMaturity('');
      await fetchContractInfo();
    } catch (error: any) {
      console.error('Maturity update error:', error);
      showError(error.message || 'Failed to update maturity duration');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCommission = async () => {
    if (!newCommission || parseFloat(newCommission) < 0) {
      showError('Please enter a valid commission percentage');
      return;
    }

    setLoading(true);
    const loadingToast = showLoading('Updating admin commission...');

    try {
      const contractService = new ContractService(window.ethereum);
      const stakingContract = contractService.getStakingContract();
      
      const commissionBasisPoints = Math.floor(parseFloat(newCommission) * 100);
      
      const tx = await stakingContract.setAdminCommission(commissionBasisPoints);
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Waiting for confirmation...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess(`Admin commission updated to ${newCommission}%`);
      setNewCommission('');
      await fetchContractInfo();
    } catch (error: any) {
      console.error('Commission update error:', error);
      showError(error.message || 'Failed to update commission');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePause = async () => {
    setLoading(true);
    const loadingToast = showLoading(isPaused ? 'Unpausing staking...' : 'Pausing staking...');

    try {
      const contractService = new ContractService(window.ethereum);
      const stakingContract = contractService.getStakingContract();
      
      const tx = await stakingContract.setPaused(!isPaused);
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Waiting for confirmation...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess(isPaused ? 'Staking unpaused' : 'Staking paused');
      await fetchContractInfo();
    } catch (error: any) {
      console.error('Pause toggle error:', error);
      showError(error.message || 'Failed to toggle pause');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Controls</h1>
        <p className="text-gray-600">Manage platform settings and smart contract parameters</p>
      </div>

      {/* Current Settings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600">Current APR</h3>
            <TrendingUp className="text-blue-600" size={20} />
          </div>
          <p className="text-3xl font-bold">{currentAPR}%</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600">Maturity Duration</h3>
            <Clock className="text-purple-600" size={20} />
          </div>
          <p className="text-3xl font-bold">{Math.floor(currentMaturity / 86400)}</p>
          <p className="text-xs text-gray-600">days</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600">Admin Commission</h3>
            <DollarSign className="text-green-600" size={20} />
          </div>
          <p className="text-3xl font-bold">{currentCommission}%</p>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-600">Staking Status</h3>
            {isPaused ? <Pause className="text-red-600" size={20} /> : <Play className="text-green-600" size={20} />}
          </div>
          <p className="text-2xl font-bold">{isPaused ? 'Paused' : 'Active'}</p>
        </div>
      </div>

      {/* Control Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ✅ ADMIN FEE CLAIM SECTION - ADDED AT TOP */}
        <div className="bg-white rounded-lg border p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="text-green-600" size={24} />
            <h2 className="text-xl font-bold">Claim Admin Fees</h2>
            {adminType && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {adminType.charAt(0).toUpperCase() + adminType.slice(1)} Admin
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-green-700 mb-1">Available to Claim</p>
                  <p className="text-3xl font-bold text-green-600">
                    {parseFloat(adminFees).toFixed(2)} INRT
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700 mb-1">Your Role</p>
                  <p className="text-lg font-bold text-green-600">
                    {adminType ? `${adminType.charAt(0).toUpperCase() + adminType.slice(1)} Admin` : 'Not Admin'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleClaimAdminFees}
                disabled={loading || parseFloat(adminFees) === 0 || !adminType}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                  `Claim ${parseFloat(adminFees).toFixed(2)} INRT`
                )}
              </button>
              
              <p className="text-xs text-green-700 mt-2">
                💡 {adminType === 'primary' ? 'Primary admin receives 50% of platform fees' : adminType === 'secondary' ? 'Secondary admin receives 50% of platform fees' : 'Platform admin fees split between two admins'}
              </p>
            </div>
          </div>
        </div>

        {/* Update APR */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold">Update APR</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New APR (%)
              </label>
              <input
                type="number"
                value={newAPR}
                onChange={(e) => setNewAPR(e.target.value)}
                placeholder="e.g., 12"
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleUpdateAPR}
              disabled={loading || !newAPR}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              Update APR
            </button>
          </div>
        </div>

        {/* Trigger New Epoch */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="text-green-600" size={24} />
            <h2 className="text-xl font-bold">Trigger New Epoch</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="text-yellow-600 shrink-0" size={20} />
                <p className="text-sm text-yellow-800">
                  This will start a new epoch and reset available orders. Use this manually if auto-trigger fails.
                </p>
              </div>
            </div>
            <button
              onClick={handleTriggerNewEpoch}
              disabled={loading}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
            >
              Trigger New Epoch
            </button>
          </div>
        </div>

        {/* Update Maturity Duration */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold">Update Maturity Duration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Duration (days)
              </label>
              <input
                type="number"
                value={newMaturity}
                onChange={(e) => setNewMaturity(e.target.value)}
                placeholder="e.g., 180"
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleUpdateMaturity}
              disabled={loading || !newMaturity}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50"
            >
              Update Duration
            </button>
          </div>
        </div>

        {/* Update Admin Commission */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="text-orange-600" size={24} />
            <h2 className="text-xl font-bold">Update Admin Commission</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Commission (%)
              </label>
              <input
                type="number"
                value={newCommission}
                onChange={(e) => setNewCommission(e.target.value)}
                placeholder="e.g., 5"
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
              />
            </div>
            <button
              onClick={handleUpdateCommission}
              disabled={loading || !newCommission}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium disabled:opacity-50"
            >
              Update Commission
            </button>
          </div>
        </div>

        {/* Pause/Unpause Staking */}
        <div className="bg-white rounded-lg border p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            {isPaused ? <Play className="text-green-600" size={24} /> : <Pause className="text-red-600" size={24} />}
            <h2 className="text-xl font-bold">Emergency Controls</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertCircle className="text-red-600 shrink-0" size={20} />
                <p className="text-sm text-red-800">
                  {isPaused 
                    ? 'Staking is currently PAUSED. Users cannot create new stakes.' 
                    : 'Staking is currently ACTIVE. Click below to pause all new stakes.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePause}
              disabled={loading}
              className={`w-full px-4 py-3 text-white rounded-lg font-medium disabled:opacity-50 ${
                isPaused 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isPaused ? 'Unpause Staking' : 'Pause Staking'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
