'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, TrendingUp, RefreshCw, Clock, Package, Share2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ContractService, CONTRACTS } from '@/lib/contracts';
import { parseContractError } from '@/lib/contracts/errorHandler';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';
import { ethers } from 'ethers';

export default function CreateInvestmentPage() {
  const { user, token } = useAuth();
  const { address } = useAccount();
  const router = useRouter();

  // Token & Amount State
  const [selectedToken, setSelectedToken] = useState<'INRT' | 'USDT'>('INRT');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Token Info State
  const [inrtInfo, setInrtInfo] = useState<any>(null);
  const [usdtInfo, setUsdtInfo] = useState<any>(null);
  const [currentAPR, setCurrentAPR] = useState<number>(0);
  const [maturityDays, setMaturityDays] = useState<number>(0);

  // Referral State
  const [referralStatus, setReferralStatus] = useState<any>(null);
  const referrerChecked = useRef(false);
  const referrerIsSet = useRef(false);

  // Approval State
  const [useMaxApproval, setUseMaxApproval] = useState(true);
  const [customApprovalAmount, setCustomApprovalAmount] = useState('');
  const [currentAllowance, setCurrentAllowance] = useState<string>('0');
  const [checkingAllowance, setCheckingAllowance] = useState(false);

  // Computed Values
  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();
  const selectedTokenInfo = selectedToken === 'INRT' ? inrtInfo : usdtInfo;
  const needsApproval = parseFloat(currentAllowance) < parseFloat(amount || '0');
  const hasInfiniteApproval = parseFloat(currentAllowance) > 1000000000;

  // ========== LIFECYCLE ==========
  useEffect(() => {
    if (address && window.ethereum) {
      referrerChecked.current = false;
      referrerIsSet.current = false;
      
      fetchTokenInfo();
      fetchReferralInfo();
      checkCurrentAllowance();
    }
    // eslint-disable-next-line
  }, [address, selectedToken]);

  // ========== FETCH FUNCTIONS ==========

  const fetchTokenInfo = async () => {
    if (!address || !window.ethereum) return;
    
    setLoadingInfo(true);
    try {
      const contractService = new ContractService(window.ethereum);
      
      const [
        baseApr,
        autoReinvestBonus,
        defaultMat,
        orderSizeINRTStr,
        orderSizeUSDTStr,
        epochCounter,
        epochMaxOrders,
        inrtBalance,
        usdtBalance
      ] = await Promise.all([
        contractService.getBaseAPR(),
        contractService.getAutoReinvestBonusAPR(),
        contractService.getMaturityDays(),
        contractService.getOrderSizeINRT(),
        contractService.getOrderSizeUSDT(),
        contractService.getEpochCounter(),
        contractService.getEpochMaxOrders(),
        contractService.getTokenBalance(CONTRACTS.INRT, address),
        contractService.getTokenBalance(CONTRACTS.USDT, address)
      ]);

      const epochInfo = await contractService.getEpochInfo(epochCounter);
      const availableOrders = epochMaxOrders - epochInfo.totalOrders;
      
      const orderSizeINRT = parseFloat(orderSizeINRTStr) / 1e6;
      const orderSizeUSDT = parseFloat(orderSizeUSDTStr) / 1e6;
      
      // ✅ Convert APR from basis points to percentage
      const aprPercentage = baseApr / 100;

      setCurrentAPR(aprPercentage);
      setMaturityDays(defaultMat);

      setInrtInfo({
        balance: inrtBalance,
        availableOrders,
        currentEpoch: epochCounter,
        orderSize: orderSizeINRT
      });

      setUsdtInfo({
        balance: usdtBalance,
        availableOrders,
        currentEpoch: epochCounter,
        orderSize: orderSizeUSDT
      });

    } catch (error: any) {
      console.error('Fetch error:', error);
      const friendlyMessage = parseContractError(error);
      showError(friendlyMessage);
    } finally {
      setLoadingInfo(false);
    }
  };

  const fetchReferralInfo = async () => {
    if (!address || !window.ethereum) return;
    
    try {
      const contractService = new ContractService(window.ethereum);
      const refData = await contractService.getReferralInfo(address);
      setReferralStatus(refData);
      
      if (refData.referrer && refData.referrer !== '0x0000000000000000000000000000000000000000') {
        referrerChecked.current = true;
        referrerIsSet.current = true;
      }
    } catch (error: any) {
      console.error('Referral fetch error:', error);
      setReferralStatus(null);
    }
  };

  const checkCurrentAllowance = async () => {
    if (!address || !window.ethereum) return;
    
    setCheckingAllowance(true);
    try {
      const contractService = new ContractService(window.ethereum);
      const tokenAddress = selectedToken === 'INRT' ? CONTRACTS.INRT : CONTRACTS.USDT;
      const allowance = await contractService.checkAllowance(tokenAddress, address);
      setCurrentAllowance(allowance);
    } catch (error: any) {
      console.error('Error checking allowance:', error);
    } finally {
      setCheckingAllowance(false);
    }
  };

  // ========== REFERRER MANAGEMENT ==========
  
  const ensureReferrerIsSet = async (): Promise<boolean> => {
    if (!address || !window.ethereum || !token) return false;
    
    const contractService = new ContractService(window.ethereum);
    const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET!;
    
    try {
      console.log('✅ Checking referrer on blockchain...');
      const refData = await contractService.getReferralInfo(address);
      
      if (refData.referrer && refData.referrer !== '0x0000000000000000000000000000000000000000') {
        console.log('✅ Referrer already set:', refData.referrer);
        referrerChecked.current = true;
        referrerIsSet.current = true;
        return true;
      }

      console.log('⚠️ Referrer NOT set on blockchain');

      if (address.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
        console.log('✅ Admin wallet - will auto-set during stake');
        referrerChecked.current = true;
        referrerIsSet.current = true;
        return true;
      }

      let referrerWalletAddress: string | null = null;
      
      try {
        const response = await fetch('/api/v1/users/profile', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user.referredBy && data.user.referredBy !== '0x0000000000000000000000000000000000000000') {
            referrerWalletAddress = data.user.referredBy;
            console.log('✅ Found referrer in DB:', referrerWalletAddress);
          }
        }
      } catch (dbError) {
        console.error('Database fetch error:', dbError);
      }

      let finalReferrer: string;
      if (referrerWalletAddress) {
        finalReferrer = referrerWalletAddress;
      } else {
        finalReferrer = ADMIN_WALLET;
        console.log('ℹ️ Using admin wallet as referrer');
      }

      if (!ethers.utils.isAddress(finalReferrer)) {
        showError('Invalid referrer address');
        return false;
      }

      finalReferrer = ethers.utils.getAddress(finalReferrer);

      if (finalReferrer.toLowerCase() === address.toLowerCase()) {
        console.log('✅ Self-referral - letting contract handle');
        referrerChecked.current = true;
        referrerIsSet.current = true;
        return true;
      }

      console.log('🔄 Setting referrer on blockchain:', finalReferrer);
      const setRefToast = showLoading('Setting referrer...');
      
      const tx = await contractService.setReferrer(finalReferrer);
      dismissToast(setRefToast);
      
      const waitToast = showLoading('Confirming...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess('Referrer set successfully!');

      const verifyData = await contractService.getReferralInfo(address);
      if (verifyData.referrer && verifyData.referrer !== '0x0000000000000000000000000000000000000000') {
        referrerChecked.current = true;
        referrerIsSet.current = true;
        await fetchReferralInfo();
        return true;
      } else {
        showError('Verification failed');
        return false;
      }

    } catch (error: any) {
      const friendlyMessage = parseContractError(error);
      showError(friendlyMessage);
      return false;
    }
  };

  // ========== CLAIM REFERRAL ==========
  
  const handleClaimReferral = async () => {
    if (!address || !window.ethereum) return;
    
    const isINRT = selectedToken === 'INRT';
    const accruedAmount = isINRT 
      ? parseFloat(referralStatus?.accruedBonusINRT || '0') / 1e6
      : parseFloat(referralStatus?.accruedBonusUSDT || '0') / 1e6;

    if (accruedAmount === 0) {
      showError('No referral bonus to claim');
      return;
    }

    setLoading(true);
    const loadingToast = showLoading('Claiming referral bonus...');
    
    try {
      const contractService = new ContractService(window.ethereum);
      const tokenAddr = selectedToken === 'INRT' ? CONTRACTS.INRT : CONTRACTS.USDT;
      const deadline = contractService.getDeadline(20);
      
      const tx = await contractService.claimReferralBonus(tokenAddr, deadline);
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Confirming...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess('Referral bonus claimed!');
      
      await Promise.all([
        fetchReferralInfo(),
        fetchTokenInfo(),
        checkCurrentAllowance()
      ]);

    } catch (error: any) {
      dismissToast(loadingToast);
      const friendlyMessage = parseContractError(error);
      showError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // ========== STAKE TOKENS ==========
  
  const handleStake = async () => {
    if (!amount || parseFloat(amount) === 0) {
      showError('Please enter a valid amount');
      return;
    }

    if (!address || !window.ethereum) {
      showError('Please connect your wallet');
      return;
    }

    const tokenAddress = selectedToken === 'INRT' ? CONTRACTS.INRT : CONTRACTS.USDT;
    const tokenInfo = selectedTokenInfo;

    if (!tokenInfo) {
      showError('Token information not loaded');
      return;
    }

    const contractService = new ContractService(window.ethereum);
    const orderSize = tokenInfo.orderSize;
    const stakeAmount = parseFloat(amount);

    if (stakeAmount > parseFloat(tokenInfo.balance)) {
      showError(`Insufficient ${selectedToken} balance`);
      return;
    }

    const tolerance = 0.000001;
    if (Math.abs(stakeAmount % orderSize) > tolerance && Math.abs((stakeAmount % orderSize) - orderSize) > tolerance) {
      showError(`Amount must be a multiple of ${orderSize}`);
      return;
    }

    const desiredOrders = Math.round(stakeAmount / orderSize);
    const MAX_ORDERS_PER_TX = 50;
    const needsBatching = desiredOrders > MAX_ORDERS_PER_TX;

    if (needsBatching) {
      const numBatches = Math.ceil(desiredOrders / MAX_ORDERS_PER_TX);
      const batchAmounts: number[] = [];

      for (let i = 0; i < numBatches; i++) {
        const isLastBatch = i === numBatches - 1;
        const ordersInBatch = isLastBatch ? desiredOrders - i * MAX_ORDERS_PER_TX : MAX_ORDERS_PER_TX;
        batchAmounts.push(ordersInBatch * orderSize);
      }

      const confirmed = window.confirm(
        `Large Stake Detected!\n\nTotal: ${stakeAmount} ${selectedToken} (${desiredOrders} orders)\n\nDue to blockchain gas limits, this will be split into ${numBatches} transactions:\n\n${batchAmounts.map((amt, i) => `${i + 1}. ${amt.toFixed(2)} ${selectedToken} (${Math.round(amt / orderSize)} orders)`).join('\n')}\n\nEach transaction requires separate approval in MetaMask.\n\nContinue?`
      );

      if (!confirmed) return;

      await handleBatchedStake(batchAmounts, tokenAddress, tokenInfo);
      return;
    }

    await handleSingleStake(amount, tokenAddress, tokenInfo);
  };

  const handleBatchedStake = async (batchAmounts: number[], tokenAddress: string, tokenInfo: any) => {
    setLoading(true);
    const contractService = new ContractService(window.ethereum);
    const allTxHashes: string[] = [];
    let successfulBatches = 0;

    try {
      const referrerSet = await ensureReferrerIsSet();
      if (!referrerSet) {
        showError('Failed to set referrer');
        setLoading(false);
        return;
      }

      const totalAmount = batchAmounts.reduce((sum, amt) => sum + amt, 0);

      const currentAllowanceNum = parseFloat(currentAllowance);
      const needsApproval = currentAllowanceNum < totalAmount;

      if (needsApproval) {
        const approveToast = showLoading(`Approving ${totalAmount.toFixed(2)} ${selectedToken}...`);
        try {
          let approveTx;
          if (useMaxApproval) {
            const tokenContract = contractService.getTokenContract(tokenAddress);
            approveTx = await tokenContract.approve(CONTRACTS.STAKING, ethers.constants.MaxUint256);
          } else {
            approveTx = await contractService.approveToken(tokenAddress, totalAmount.toString());
          }

          dismissToast(approveToast);
          const approveWaitToast = showLoading('Confirming approval...');
          await approveTx.wait();
          dismissToast(approveWaitToast);
          showSuccess(`${selectedToken} approved!`);
          await checkCurrentAllowance();
        } catch (approvalError: any) {
          dismissToast(approveToast);
          const friendlyMessage = parseContractError(approvalError);
          showError(friendlyMessage);
          setLoading(false);
          return;
        }
      }

      for (let i = 0; i < batchAmounts.length; i++) {
        const batchAmount = batchAmounts[i];
        const batchNumber = i + 1;
        const totalBatches = batchAmounts.length;

        const batchToast = showLoading(`Staking batch ${batchNumber}/${totalBatches}... ${batchAmount.toFixed(2)} ${selectedToken}`);

        try {
          const deadline = contractService.getDeadline(20);
          const stakeTx = await contractService.stake(tokenAddress, batchAmount.toString(), false, deadline);
          
          dismissToast(batchToast);

          const waitToast = showLoading(`Confirming batch ${batchNumber}/${totalBatches}...`);
          const receipt = await stakeTx.wait();
          dismissToast(waitToast);

          allTxHashes.push(receipt.transactionHash);
          successfulBatches++;
          showSuccess(`Batch ${batchNumber}/${totalBatches} confirmed!`);

          if (i < batchAmounts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (batchError: any) {
          dismissToast(batchToast);
          const friendlyMessage = parseContractError(batchError);
          showError(`Batch ${batchNumber} failed: ${friendlyMessage}`);

          if (i < batchAmounts.length - 1) {
            const continueConfirm = window.confirm(
              `Batch ${batchNumber} failed.\n\n${successfulBatches} batches completed successfully.\n${batchAmounts.length - batchNumber} batches remaining.\n\nContinue with remaining batches?`
            );
            if (!continueConfirm) {
              setLoading(false);
              return;
            }
          } else {
            setLoading(false);
            return;
          }
        }
      }

      if (allTxHashes.length > 0) {
        const saveToast = showLoading('Saving to database...');
        try {
          const totalStaked = batchAmounts.reduce((sum, amt) => sum + amt, 0);
          const saveRes = await fetch('/api/v1/investments/create', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              txHash: allTxHashes[0],
              additionalTxHashes: allTxHashes.slice(1),
              tokenAddress,
              tokenSymbol: selectedToken,
              amount: totalStaked.toString(),
              epochId: tokenInfo.currentEpoch,
              currentAPR,
              maturityDuration: Number(maturityDays) * 86400,
              isBatched: true,
              batchCount: allTxHashes.length
            })
          });

          dismissToast(saveToast);

          if (saveRes.ok) {
            showSuccess(`All ${successfulBatches} batches completed! Total staked: ${batchAmounts.reduce((sum, amt) => sum + amt, 0).toFixed(2)} ${selectedToken}`);
            setTimeout(() => router.push('/dashboard/investments'), 3000);
          } else {
            const errorData = await saveRes.json();
            showError(`Staking successful but database save failed: ${errorData.error?.message}`);
          }
        } catch (saveError) {
          console.error('Database save error:', saveError);
          showError('Staking successful but failed to save to database');
        }
      }

    } catch (error: any) {
      console.error('Batched stake error:', error);
      const friendlyMessage = parseContractError(error);
      showError(friendlyMessage);
    } finally {
      setLoading(false);
      await Promise.all([fetchTokenInfo(), fetchReferralInfo(), checkCurrentAllowance()]);
    }
  };

  const handleSingleStake = async (amount: string, tokenAddress: string, tokenInfo: any) => {
    setLoading(true);

    try {
      const referrerSet = await ensureReferrerIsSet();
      if (!referrerSet) {
        showError('Failed to set referrer');
        setLoading(false);
        return;
      }

      const currentAllowanceNum = parseFloat(currentAllowance);
      const stakeAmount = parseFloat(amount);
      const needsApproval = currentAllowanceNum < stakeAmount;

      if (needsApproval) {
        const approveToast = showLoading(`Approving ${selectedToken}...`);
        try {
          const contractService = new ContractService(window.ethereum);
          let approveTx;

          if (useMaxApproval) {
            const tokenContract = contractService.getTokenContract(tokenAddress);
            approveTx = await tokenContract.approve(CONTRACTS.STAKING, ethers.constants.MaxUint256);
          } else {
            const approvalAmount = customApprovalAmount || amount;
            approveTx = await contractService.approveToken(tokenAddress, approvalAmount);
          }

          dismissToast(approveToast);
          const approveWaitToast = showLoading('Confirming approval...');
          await approveTx.wait();
          dismissToast(approveWaitToast);
          showSuccess(`${selectedToken} approved!`);
          await checkCurrentAllowance();
        } catch (approvalError: any) {
          dismissToast(approveToast);
          const friendlyMessage = parseContractError(approvalError);
          showError(friendlyMessage);
          setLoading(false);
          return;
        }
      }

      const contractService = new ContractService(window.ethereum);
      const stakeToast = showLoading('Staking tokens...');
      const deadline = contractService.getDeadline(20);

      const stakeTx = await contractService.stake(tokenAddress, amount, false, deadline);
      dismissToast(stakeToast);

      const confirmToast = showLoading('Confirming on blockchain...');
      const receipt = await stakeTx.wait();
      dismissToast(confirmToast);

      const saveToast = showLoading('Saving to database...');
      const saveRes = await fetch('/api/v1/investments/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          txHash: receipt.transactionHash,
          tokenAddress,
          tokenSymbol: selectedToken,
          amount: amount,
          epochId: tokenInfo.currentEpoch,
          currentAPR,
          maturityDuration: Number(maturityDays) * 86400
        })
      });

      dismissToast(saveToast);

      if (saveRes.ok) {
        showSuccess(`Successfully staked ${amount} ${selectedToken}!`);
        setTimeout(() => router.push('/dashboard/investments'), 2000);
      } else {
        const errorData = await saveRes.json();
        showError(errorData.error?.message || 'Failed to save to database');
      }

    } catch (error: any) {
      const friendlyMessage = parseContractError(error);
      showError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // ========== HELPER FUNCTIONS ==========

  const calculateExpectedReturn = () => {
    const stakeAmount = parseFloat(amount || '0');
    if (stakeAmount === 0 || currentAPR === 0 || maturityDays === 0) {
      return { total: '0.00', profit: '0.00', netProfit: '0.00' };
    }

    const dailyRate = currentAPR / 365 / 100;
    const interest = stakeAmount * dailyRate * maturityDays;
    const interestFee = interest * 0.05;
    const netInterest = interest - interestFee;
    const total = stakeAmount + netInterest;

    return {
      total: total.toFixed(2),
      profit: interest.toFixed(2),
      netProfit: netInterest.toFixed(2),
    };
  };

  const getReferralBonusDisplay = () => {
    if (!referralStatus) return '0.00';
    const isINRT = selectedToken === 'INRT';
    const accrued = isINRT 
      ? parseFloat(referralStatus.accruedBonusINRT || '0') / 1e6
      : parseFloat(referralStatus.accruedBonusUSDT || '0') / 1e6;
    return accrued.toFixed(2);
  };

  const handleWhatsAppShare = () => {
    const referralLink = `${window.location.origin}/signup?ref=${user?.customReferralCode}`;
    const message = `🚀 Join Liberty Finance - Earn up to ${currentAPR}% APR!\n\n💰 High APR rewards\n🔒 Secure smart contracts\n🎁 Referral bonuses\n\nJoin: ${referralLink}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const expectedReturn = calculateExpectedReturn();

  

  // ========== RENDER ==========
  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/investments" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft size={20} />
          Back to Investments
        </Link>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Stake Tokens</h1>
            <p className="text-sm sm:text-base text-gray-600">Choose a token and stake to start earning</p>
          </div>
          <div className="flex flex-col xs:flex-row gap-2">
            <button
              onClick={() => {
                fetchTokenInfo();
                checkCurrentAllowance();
              }}
              disabled={loadingInfo}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              <RefreshCw size={16} className={loadingInfo ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Share2 size={16} />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Referral Banner */}
      {referralStatus && referralStatus.referrer && referralStatus.referrer !== '0x0000000000000000000000000000000000000000' && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">Your Referrer</p>
              <p className="font-mono text-sm text-blue-600 break-all">{referralStatus.referrer}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-600">Accrued Bonus ({selectedToken})</p>
                <p className="text-lg font-bold text-green-600">{getReferralBonusDisplay()}</p>
              </div>
              <button 
                onClick={handleClaimReferral} 
                disabled={loading || parseFloat(getReferralBonusDisplay()) === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Status Banner */}
      {!checkingAllowance && (
        <div className={`mb-6 rounded-lg border p-4 ${
          hasInfiniteApproval 
            ? 'bg-green-50 border-green-200' 
            : needsApproval 
            ? 'bg-yellow-50 border-yellow-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            {hasInfiniteApproval ? (
              <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            ) : needsApproval ? (
              <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            ) : (
              <CheckCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            )}
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {hasInfiniteApproval 
                  ? `Unlimited ${selectedToken} Approval Active` 
                  : needsApproval 
                  ? `Approval Required` 
                  : `Current Allowance: ${parseFloat(currentAllowance).toFixed(2)} ${selectedToken}`
                }
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {hasInfiniteApproval 
                  ? 'You can stake any amount without additional approvals' 
                  : needsApproval 
                  ? `You need to approve ${selectedToken} before staking` 
                  : 'Sufficient approval for this stake'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Epoch Info Cards */}
      {selectedTokenInfo && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Current Epoch */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 sm:p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={20} />
                <h3 className="text-lg font-bold">Current Epoch</h3>
              </div>
              <p className="text-3xl sm:text-4xl font-bold">#{selectedTokenInfo.currentEpoch}</p>
              <p className="text-xs opacity-90 mt-1">Updates when full</p>
            </div>

            {/* Available Orders */}
            <div className={`bg-gradient-to-r rounded-lg p-4 sm:p-6 text-white ${
              selectedTokenInfo.availableOrders > 0 
                ? 'from-green-600 to-green-700' 
                : 'from-red-600 to-red-700'
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <Package size={20} />
                <h3 className="text-lg font-bold">Available Orders</h3>
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{selectedTokenInfo.availableOrders}</p>
              <p className="text-xs opacity-90 mt-1">
                {selectedTokenInfo.availableOrders > 0 
                  ? 'Orders remaining' 
                  : 'Epoch full'}
              </p>
            </div>

            {/* Current APR */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4 sm:p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp size={20} />
                <h3 className="text-lg font-bold">Current APR</h3>
              </div>
              <p className="text-3xl sm:text-4xl font-bold">{currentAPR}%</p>
              <p className="text-xs opacity-90 mt-1">{maturityDays} day period</p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Stake Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Token Selection */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-xl font-bold mb-4">Select Token</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* INRT Card */}
                  <button
                    onClick={() => {
                      setSelectedToken('INRT');
                      checkCurrentAllowance();
                    }}
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
                      <TrendingUp className="text-blue-600" size={18} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">APR:</span>
                        <span className="font-bold text-green-600">{currentAPR}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Balance:</span>
                        <span className="font-bold">{parseFloat(inrtInfo?.balance || '0').toFixed(2)}</span>
                      </div>
                    </div>
                  </button>

                  {/* USDT Card */}
                  <button
                    onClick={() => {
                      setSelectedToken('USDT');
                      checkCurrentAllowance();
                    }}
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
                      <TrendingUp className="text-green-600" size={18} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">APR:</span>
                        <span className="font-bold text-green-600">{currentAPR}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Balance:</span>
                        <span className="font-bold">{parseFloat(usdtInfo?.balance || '0').toFixed(2)}</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Approval Settings (if not infinite) */}
              {!hasInfiniteApproval && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Info size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-lg">Approval Settings</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="maxApproval"
                        checked={useMaxApproval}
                        onChange={(e) => setUseMaxApproval(e.target.checked)}
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                      />
                      <label htmlFor="maxApproval" className="text-sm cursor-pointer">
                        <span className="font-medium">Enable unlimited approval</span>
                        <span className="text-gray-600 block mt-1">
                          Approve once for all future stakes (recommended - saves gas)
                        </span>
                      </label>
                    </div>
                    
                    {!useMaxApproval && (
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Custom Approval Amount ({selectedToken})
                        </label>
                        <input
                          type="number"
                          value={customApprovalAmount}
                          onChange={(e) => setCustomApprovalAmount(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Enter amount (e.g., ${amount || '1000'})`}
                        />
                        <p className="text-xs text-gray-600 mt-2">
                          Leave empty to approve only the current stake amount.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                      placeholder={`Enter amount (multiples of ${selectedTokenInfo?.orderSize || 10})`}
                      disabled={loading || loadingInfo}
                      step={selectedTokenInfo?.orderSize || 10}
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
                    <p className="text-xs text-gray-500 mt-1">
                      Order size: {selectedTokenInfo?.orderSize || 10} {selectedToken} per order
                    </p>
                  </div>

                  <button
                    onClick={handleStake}
                    disabled={loading || loadingInfo || !amount || !address || selectedTokenInfo?.availableOrders === 0}
                    className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
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

            {/* Right Column - Summary */}
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg p-6 text-white h-fit sticky top-4">
              <h2 className="text-xl font-bold mb-6">Stake Summary</h2>
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
                  <p className="text-sm opacity-90">Staking Period</p>
                  <p className="text-3xl font-bold">{maturityDays}</p>
                  <p className="text-sm opacity-90">Day{maturityDays > 1 ? 's' : ''}</p>
                </div>
                <div className="border-t border-white/20 pt-4">
                  <p className="text-sm opacity-90">Stake Amount</p>
                  <p className="text-3xl font-bold">{parseFloat(amount || '0').toFixed(2)}</p>
                  <p className="text-sm opacity-90">{selectedToken}</p>
                </div>
                <div className="border-t border-white/20 pt-4">
                  <p className="text-sm opacity-90">Expected Return ({maturityDays} day{maturityDays > 1 ? 's' : ''})</p>
                  <p className="text-2xl font-bold text-green-300">
                    {expectedReturn.total} {selectedToken}
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    Gross Interest: {expectedReturn.profit} {selectedToken}
                  </p>
                  <p className="text-sm opacity-90">
                    Net Interest (5% fee): {expectedReturn.netProfit} {selectedToken}
                  </p>
                  <p className="text-xs opacity-75 mt-2">
                    Based on {currentAPR}% APR • 5% withdrawal fee applies
                  </p>
                </div>
                <div className="border-t border-white/20 pt-4">
                  <p className="text-xs opacity-75">Epoch: #{selectedTokenInfo.currentEpoch}</p>
                  <p className="text-xs opacity-75 mt-1">Available Orders: {selectedTokenInfo.availableOrders}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
