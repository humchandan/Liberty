'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, TrendingUp, RefreshCw, Clock, Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ContractService, CONTRACTS, TokenInfo } from '@/lib/contracts';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';

export default function CreateInvestmentPage() {
  const { user, token } = useAuth();
  const { address } = useAccount();
  const router = useRouter();
  
  const [selectedToken, setSelectedToken] = useState<'INRT' | 'USDT'>('INRT');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [inrtInfo, setInrtInfo] = useState<TokenInfo | null>(null);
  const [usdtInfo, setUsdtInfo] = useState<TokenInfo | null>(null);

  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  useEffect(() => {
    if (address && window.ethereum) {
      fetchTokenInfo();
    }
  }, [address]);

  const fetchTokenInfo = async () => {
    if (!address || !window.ethereum) return;
    
    setLoadingInfo(true);
    try {
      const contractService = new ContractService(window.ethereum);
      
      const [inrt, usdt] = await Promise.all([
        contractService.getTokenInfo(CONTRACTS.INRT, address),
        contractService.getTokenInfo(CONTRACTS.USDT, address),
      ]);

      setInrtInfo(inrt);
      setUsdtInfo(usdt);
    } catch (error) {
      console.error('Failed to fetch token info:', error);
      showError('Failed to fetch token information');
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleRefresh = () => {
    fetchTokenInfo();
    showSuccess('Token information refreshed');
  };

  const handleTriggerEpoch = async () => {
    if (!isAdmin) {
      showError('Only admin can trigger new epoch');
      return;
    }

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
      
      // Refresh token info
      await fetchTokenInfo();
    } catch (error: any) {
      dismissToast(loadingToast);
      console.error('Epoch trigger error:', error);
      showError(error.message || 'Failed to trigger new epoch');
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showError('Please enter a valid amount');
      return;
    }

    if (!address || !window.ethereum) {
      showError('Please connect your wallet');
      return;
    }

    const tokenAddress = selectedToken === 'INRT' ? CONTRACTS.INRT : CONTRACTS.USDT;
    const tokenInfo = selectedToken === 'INRT' ? inrtInfo : usdtInfo;
    
    if (!tokenInfo) {
      showError('Token information not loaded');
      return;
    }

    if (parseFloat(amount) > parseFloat(tokenInfo.balance)) {
      showError(`Insufficient ${selectedToken} balance`);
      return;
    }

    // ✅ CHECK IF EPOCH IS FULL
    if (tokenInfo.availableOrders === 0) {
      if (isAdmin) {
        const userConfirmed = window.confirm(
          'Current epoch is full. Would you like to trigger a new epoch and continue staking?'
        );
        
        if (userConfirmed) {
          await handleTriggerEpoch();
          // After triggering, wait a bit and refresh
          setTimeout(() => fetchTokenInfo(), 2000);
        }
      } else {
        showError('Current epoch is full. Please wait for admin to trigger new epoch or try again later.');
      }
      return;
    }

    setLoading(true);
    const loadingToast = showLoading('Processing staking...');

    try {
      const contractService = new ContractService(window.ethereum);

      // Step 1: Get APR and maturity from contract
      const stakingContract = contractService.getStakingContract();
      const [currentAPRRaw, maturityDurationRaw] = await Promise.all([
        stakingContract.currentAPR(),
        stakingContract.currentMaturityDuration(),
      ]);
      
      const currentAPR = currentAPRRaw.toNumber() / 100; // Convert basis points to percentage
      const maturityDuration = maturityDurationRaw.toNumber(); // In seconds

      console.log('📊 Contract values:', { currentAPR, maturityDuration, maturityDays: maturityDuration / 86400 });

      // Step 2: Check allowance
      dismissToast(loadingToast);
      const allowanceToast = showLoading('Checking allowance...');
      const allowance = await contractService.checkAllowance(tokenAddress, address);
      dismissToast(allowanceToast);

      // Step 3: Approve if needed
      if (parseFloat(allowance) < parseFloat(amount)) {
        const approveToast = showLoading(`Approving ${selectedToken}... Please confirm in wallet`);
        const approveTx = await contractService.approveToken(tokenAddress, amount);
        dismissToast(approveToast);
        
        const waitToast = showLoading('Waiting for approval confirmation...');
        await approveTx.wait();
        dismissToast(waitToast);
        showSuccess(`${selectedToken} approved successfully!`);
      }

      // Step 4: Stake
      const stakeToast = showLoading('Staking tokens... Please confirm in wallet');
      const stakeTx = await contractService.stake(tokenAddress, amount);
      dismissToast(stakeToast);

      const confirmToast = showLoading('Waiting for transaction confirmation...');
      const receipt = await stakeTx.wait();
      dismissToast(confirmToast);

      // ✅ Extract order_id from contract event
let orderId = 0;
try {
  const stakingContract = contractService.getStakingContract();
  const stakeEvent = receipt.events?.find((e: any) => e.event === 'OrderCreated' || e.event === 'Staked');
  if (stakeEvent && stakeEvent.args) {
    orderId = stakeEvent.args.orderId?.toNumber() || stakeEvent.args[0]?.toNumber() || 0;
    console.log('📦 Order ID from contract:', orderId);
  }
} catch (error) {
  console.warn('Could not extract order_id from event:', error);
}

      // Step 5: Save to database with contract values
      const saveToast = showLoading('Saving investment to database...');
      const saveRes = await fetch('/api/v1/investments/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          txHash: receipt.transactionHash,
          tokenAddress,
          tokenSymbol: selectedToken,
          amount: amount,
          epochId: tokenInfo.currentEpoch,
          currentAPR, // ✅ From contract
          maturityDuration, // ✅ From contract (in seconds)
          orderId, // ✅ From contract event
        }),
      });
      dismissToast(saveToast);

      if (saveRes.ok) {
        showSuccess(`Successfully staked ${amount} ${selectedToken}!`);
        setTimeout(() => {
          router.push('/dashboard/investments');
        }, 2000);
      } else {
        const errorData = await saveRes.json();
        showError(errorData.error?.message || 'Failed to save investment to database');
      }
    } catch (error: any) {
      console.error('Staking error:', error);
      if (error.code === 4001) {
        showError('Transaction rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        showError('Insufficient funds for gas fee');
      } else {
        showError(error.message || 'Failed to stake tokens');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedTokenInfo = selectedToken === 'INRT' ? inrtInfo : usdtInfo;
  const currentAPR = 12; // Display value, actual comes from contract during stake

  return (
    <DashboardLayout>
      <div className="mb-8">
        <Link
          href="/dashboard/investments"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Investments
        </Link>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Stake Tokens</h1>
            <p className="text-gray-600">Choose a token and stake to start earning</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={loadingInfo}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loadingInfo ? 'animate-spin' : ''} />
              Refresh
            </button>
            
            {isAdmin && selectedTokenInfo?.availableOrders === 0 && (
              <button
                onClick={handleTriggerEpoch}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Trigger Epoch
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Epoch Information Banner */}
      {selectedTokenInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Clock size={24} />
              <h3 className="text-lg font-bold">Current Epoch</h3>
            </div>
            <p className="text-4xl font-bold">#{selectedTokenInfo.currentEpoch}</p>
            <p className="text-sm opacity-90 mt-1">Updates when full or manually triggered</p>
          </div>

          <div className={`bg-linear-to-r rounded-lg p-6 text-white ${
            selectedTokenInfo.availableOrders > 0 
              ? 'from-green-600 to-green-700' 
              : 'from-red-600 to-red-700'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              <Package size={24} />
              <h3 className="text-lg font-bold">Available Orders</h3>
            </div>
            <p className="text-4xl font-bold">{selectedTokenInfo.availableOrders}</p>
            <p className="text-sm opacity-90 mt-1">
              {selectedTokenInfo.availableOrders > 0 
                ? 'Orders remaining in this epoch' 
                : 'Epoch full - Admin needs to trigger new epoch'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Token Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-bold mb-4">Select Token</h2>
            
            {loadingInfo ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* INRT Card */}
                <button
                  onClick={() => setSelectedToken('INRT')}
                  disabled={loading || !inrtInfo}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedToken === 'INRT'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-2xl font-bold">INRT</p>
                      <p className="text-sm text-gray-600">Indian Rupee Token</p>
                    </div>
                    <TrendingUp className="text-blue-600" size={24} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">APR:</span>
                      <span className="font-bold text-green-600">12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Balance:</span>
                      <span className="font-bold">{parseFloat(inrtInfo?.balance || '0').toFixed(2)}</span>
                    </div>
                  </div>
                </button>

                {/* USDT Card */}
                <button
                  onClick={() => setSelectedToken('USDT')}
                  disabled={loading || !usdtInfo}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedToken === 'USDT'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-2xl font-bold">USDT</p>
                      <p className="text-sm text-gray-600">Tether USD</p>
                    </div>
                    <TrendingUp className="text-green-600" size={24} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">APR:</span>
                      <span className="font-bold text-green-600">12%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Balance:</span>
                      <span className="font-bold">{parseFloat(usdtInfo?.balance || '0').toFixed(2)}</span>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-bold mb-4">Stake Amount</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ({selectedToken}) *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Enter amount to stake`}
                  disabled={loading || loadingInfo}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                />
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                  <span>Available: {parseFloat(selectedTokenInfo?.balance || '0').toFixed(2)} {selectedToken}</span>
                  <button
                    onClick={() => setAmount(selectedTokenInfo?.balance || '0')}
                    disabled={loading || loadingInfo}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Max
                  </button>
                </div>
              </div>

              {selectedTokenInfo && selectedTokenInfo.availableOrders === 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    ⚠️ <strong>Epoch is full!</strong> {isAdmin ? 'Click "Trigger Epoch" button above to start a new epoch.' : 'Please wait for admin to trigger a new epoch.'}
                  </p>
                </div>
              )}

              <button
                onClick={handleStake}
                disabled={loading || loadingInfo || !amount || !address || selectedTokenInfo?.availableOrders === 0}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Stake ${selectedToken}`
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-linear-to-br from-purple-600 to-blue-600 rounded-lg p-6 text-white h-fit sticky top-6">
          <h2 className="text-xl font-bold mb-6">Stake Summary</h2>
          
          {selectedTokenInfo ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm opacity-90">Selected Token</p>
                <p className="text-3xl font-bold">{selectedToken}</p>
              </div>

              <div className="border-t border-white/20 pt-4">
                <p className="text-sm opacity-90">APR</p>
                <p className="text-3xl font-bold text-green-300">{currentAPR}%</p>
              </div>

              <div className="border-t border-white/20 pt-4">
                <p className="text-sm opacity-90">Stake Amount</p>
                <p className="text-3xl font-bold">{parseFloat(amount || '0').toFixed(2)}</p>
                <p className="text-sm opacity-90">{selectedToken}</p>
              </div>

              <div className="border-t border-white/20 pt-4">
                <p className="text-sm opacity-90">Expected Return (Annual)</p>
                <p className="text-2xl font-bold text-green-300">
                  {(parseFloat(amount || '0') * (1 + currentAPR / 100)).toFixed(2)}
                </p>
                <p className="text-sm opacity-90">
                  Profit: {(parseFloat(amount || '0') * currentAPR / 100).toFixed(2)} {selectedToken}
                </p>
              </div>

              <div className="border-t border-white/20 pt-4">
                <p className="text-xs opacity-75">
                  Epoch: #{selectedTokenInfo.currentEpoch}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  Available Orders: {selectedTokenInfo.availableOrders}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-sm opacity-75">Loading token information...</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
