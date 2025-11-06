'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAccount } from 'wagmi';
import { ContractService, CONTRACTS } from '@/lib/contracts';
import { parseContractError } from '@/lib/contracts/errorHandler';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';
import { 
  TrendingUp, Clock, CheckCircle, AlertCircle, RefreshCw, DollarSign, 
  Package, Shield, Wallet, Activity, Info 
} from 'lucide-react';
import Link from 'next/link';

interface Order {
  orderId: number;
  user: string;
  token: string;
  totalAmount: string;
  numUnits: number;
  stakeTime: number;
  maturityTime: number;
  apr: number;
  epochId: number;
  autoReinvest: boolean;
  paidOut: boolean;
  refunded: boolean;
  canClaim: boolean;
  status: 'active' | 'matured' | 'claimed' | 'refunded';
  daysRemaining: number;
  expectedInterest: string;
  expectedTotal: string;
}

interface TreasuryInfo {
  reserve: string;
  operational: string;
  activePrincipal: string;
  activeInterest: string;
  totalAvailable: string;
  totalRequired: string;
  isSolvent: boolean;
  surplusDeficit: string;
}

export default function InvestmentsPage() {
  const { user, token } = useAuth();
  const { address } = useAccount();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [treasuryInfo, setTreasuryInfo] = useState<TreasuryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingOrderId, setClaimingOrderId] = useState<number | null>(null);
  const [batchClaimMode, setBatchClaimMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [showTreasuryDetails, setShowTreasuryDetails] = useState(false);

  useEffect(() => {
    if (address && window.ethereum) {
      fetchOrders();
      fetchTreasuryInfo();
    }
    // eslint-disable-next-line
  }, [address]);

  const fetchTreasuryInfo = async () => {
    if (!window.ethereum) return;
    
    try {
      const contractService = new ContractService(window.ethereum);
      
      const [breakdown, solvency] = await Promise.all([
        contractService.getTreasuryBreakdown(),
        contractService.getSolvencyStatus(),
      ]);

      const totalAvailable = (parseFloat(breakdown.reserve) + parseFloat(breakdown.operational)) / 1e6;
      const totalRequired = (parseFloat(breakdown.activePrincipal) + parseFloat(breakdown.activeInterest)) / 1e6;
      const surplusDeficit = totalAvailable - totalRequired;

      setTreasuryInfo({
        reserve: (parseFloat(breakdown.reserve) / 1e6).toFixed(2),
        operational: (parseFloat(breakdown.operational) / 1e6).toFixed(2),
        activePrincipal: (parseFloat(breakdown.activePrincipal) / 1e6).toFixed(2),
        activeInterest: (parseFloat(breakdown.activeInterest) / 1e6).toFixed(2),
        totalAvailable: totalAvailable.toFixed(2),
        totalRequired: totalRequired.toFixed(2),
        isSolvent: solvency.isSolvent,
        surplusDeficit: surplusDeficit.toFixed(2),
      });
    } catch (error: any) {
      console.error('Failed to fetch treasury info:', error);
    }
  };

  const fetchOrders = async () => {
    if (!address || !window.ethereum) return;
    
    setRefreshing(true);
    try {
      const contractService = new ContractService(window.ethereum);
      const orderIds = await contractService.getUserOrders(address);
      
      const ordersData = await Promise.all(
        orderIds.map(async (orderId) => {
          const order = await contractService.getOrder(orderId);
          const epoch = await contractService.getEpochInfo(order.epochId);
          
          const now = Math.floor(Date.now() / 1000);
          const matured = now >= order.maturityTime;
          const canClaim = epoch.isFull && matured && !order.paidOut && !order.refunded;
          
          const daysRemaining = Math.max(0, Math.ceil((order.maturityTime - now) / 86400));
          
          // Calculate expected interest
          const duration = (order.maturityTime - order.stakeTime) / 86400;
          const principal = parseFloat(order.totalAmount) / 1e6;
          const interest = (principal * order.apr * duration) / (10000 * 365);
          const interestFee = interest * 0.05;
          const netInterest = interest - interestFee;
          const total = principal + netInterest;
          
          let status: Order['status'] = 'active';
          if (order.paidOut) status = 'claimed';
          else if (order.refunded) status = 'refunded';
          else if (canClaim) status = 'matured';
          
          return {
            ...order,
            canClaim,
            status,
            daysRemaining,
            expectedInterest: netInterest.toFixed(2),
            expectedTotal: total.toFixed(2),
          };
        })
      );
      
      ordersData.sort((a, b) => {
        if (a.canClaim && !b.canClaim) return -1;
        if (!a.canClaim && b.canClaim) return 1;
        return a.maturityTime - b.maturityTime;
      });
      
      setOrders(ordersData);
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      const friendlyMessage = parseContractError(error);
      showError(friendlyMessage);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleClaimSingle = async (orderId: number) => {
    if (!address || !window.ethereum) return;
    
    setClaimingOrderId(orderId);
    const loadingToast = showLoading('Claiming investment...');
    
    try {
      const contractService = new ContractService(window.ethereum);
      const deadline = contractService.getDeadline(20);
      
      const tx = await contractService.claimOrder(orderId, deadline, '0');
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Confirming on blockchain...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess('Investment claimed successfully! 🎉');
      
      await Promise.all([fetchOrders(), fetchTreasuryInfo()]);
    } catch (error: any) {
      dismissToast(loadingToast);
      const friendlyMessage = parseContractError(error);
      showError(friendlyMessage);
    } finally {
      setClaimingOrderId(null);
    }
  };

  const handleClaimMultiple = async () => {
    if (!address || !window.ethereum || selectedOrders.size === 0) return;
    
    const orderIds = Array.from(selectedOrders);
    
    setLoading(true);
    const loadingToast = showLoading(`Claiming ${orderIds.length} investments...`);
    
    try {
      const contractService = new ContractService(window.ethereum);
      const deadline = contractService.getDeadline(20);
      
      const tx = await contractService.claimMultipleOrders(orderIds, deadline, '0');
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Confirming on blockchain...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess(`Successfully claimed ${orderIds.length} investments! 🎉`);
      
      setSelectedOrders(new Set());
      setBatchClaimMode(false);
      await Promise.all([fetchOrders(), fetchTreasuryInfo()]);
    } catch (error: any) {
      dismissToast(loadingToast);
      const friendlyMessage = parseContractError(error);
      showError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAll = () => {
    fetchOrders();
    fetchTreasuryInfo();
  };

  const toggleOrderSelection = (orderId: number) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(orderId)) {
      newSelection.delete(orderId);
    } else {
      newSelection.add(orderId);
    }
    setSelectedOrders(newSelection);
  };

  const selectAllClaimable = () => {
    const claimableIds = orders.filter(o => o.canClaim).map(o => o.orderId);
    setSelectedOrders(new Set(claimableIds));
  };

  const stats = {
    total: orders.length,
    active: orders.filter(o => o.status === 'active').length,
    matured: orders.filter(o => o.status === 'matured').length,
    claimed: orders.filter(o => o.status === 'claimed').length,
    totalInvested: orders.reduce((sum, o) => sum + parseFloat(o.totalAmount) / 1e6, 0).toFixed(2),
    claimableAmount: orders
      .filter(o => o.canClaim)
      .reduce((sum, o) => sum + parseFloat(o.expectedTotal), 0)
      .toFixed(2),
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">My Investments</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Track and manage your staking positions
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm whitespace-nowrap"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          
          <Link
            href="/dashboard/investments/create"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm whitespace-nowrap"
          >
            + New Stake
          </Link>
        </div>
      </div>

      {/* Treasury & Solvency Dashboard */}
      <div className="mb-6">
        <button
          onClick={() => setShowTreasuryDetails(!showTreasuryDetails)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-4 flex items-center justify-between hover:from-blue-700 hover:to-purple-700 transition-all"
        >
          <div className="flex items-center gap-3">
            <Shield size={24} />
            <div className="text-left">
              <h3 className="font-bold text-lg">Contract Treasury Status</h3>
              <p className="text-xs opacity-90">
                {treasuryInfo?.isSolvent ? '✓ Solvent' : '⚠️ Check Required'} • 
                Available: {treasuryInfo?.totalAvailable || '...'} • 
                Required: {treasuryInfo?.totalRequired || '...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              treasuryInfo?.isSolvent 
                ? 'bg-green-400 text-green-900' 
                : 'bg-yellow-400 text-yellow-900'
            }`}>
              {treasuryInfo?.isSolvent ? 'HEALTHY' : 'MONITOR'}
            </span>
            <Info size={20} className={showTreasuryDetails ? 'rotate-180' : ''} />
          </div>
        </button>

        {showTreasuryDetails && treasuryInfo && (
          <div className="mt-2 bg-white rounded-lg border p-6 space-y-4">
            <h4 className="font-bold text-lg mb-4">Treasury Breakdown</h4>
            
            {/* Solvency Summary */}
            <div className={`p-4 rounded-lg ${
              treasuryInfo.isSolvent ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {treasuryInfo.isSolvent ? (
                  <CheckCircle className="text-green-600" size={20} />
                ) : (
                  <AlertCircle className="text-yellow-600" size={20} />
                )}
                <h5 className="font-semibold">
                  {treasuryInfo.isSolvent ? 'Protocol is Solvent ✓' : 'Monitoring Required ⚠️'}
                </h5>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Available</p>
                  <p className="font-bold text-lg">{treasuryInfo.totalAvailable}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Required</p>
                  <p className="font-bold text-lg">{treasuryInfo.totalRequired}</p>
                </div>
                <div>
                  <p className="text-gray-600">Surplus/Deficit</p>
                  <p className={`font-bold text-lg ${
                    parseFloat(treasuryInfo.surplusDeficit) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {parseFloat(treasuryInfo.surplusDeficit) >= 0 ? '+' : ''}{treasuryInfo.surplusDeficit}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Assets */}
              <div className="border rounded-lg p-4">
                <h5 className="font-semibold mb-3 flex items-center gap-2">
                  <Wallet size={18} className="text-green-600" />
                  Assets (Treasury)
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reserve (Interest):</span>
                    <span className="font-bold">{treasuryInfo.reserve}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Operational (Principal):</span>
                    <span className="font-bold">{treasuryInfo.operational}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total Assets:</span>
                    <span className="font-bold text-green-600">{treasuryInfo.totalAvailable}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities */}
              <div className="border rounded-lg p-4">
                <h5 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity size={18} className="text-blue-600" />
                  Liabilities (Owed to Users)
                </h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Principal:</span>
                    <span className="font-bold">{treasuryInfo.activePrincipal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Interest:</span>
                    <span className="font-bold">{treasuryInfo.activeInterest}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-semibold">Total Liabilities:</span>
                    <span className="font-bold text-blue-600">{treasuryInfo.totalRequired}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coverage Ratio */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Coverage Ratio</span>
                <span className="text-sm font-bold">
                  {((parseFloat(treasuryInfo.totalAvailable) / parseFloat(treasuryInfo.totalRequired)) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    treasuryInfo.isSolvent ? 'bg-green-600' : 'bg-yellow-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      (parseFloat(treasuryInfo.totalAvailable) / parseFloat(treasuryInfo.totalRequired)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {treasuryInfo.isSolvent 
                  ? '✓ Treasury has sufficient funds to cover all user liabilities' 
                  : '⚠️ Treasury balance is below required reserves. Admin should deposit more funds.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm text-gray-600">Total Invested</h3>
            <DollarSign size={16} className="text-blue-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.totalInvested}</p>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm text-gray-600">Active</h3>
            <TrendingUp size={16} className="text-green-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.active}</p>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm text-gray-600">Matured</h3>
            <CheckCircle size={16} className="text-orange-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.matured}</p>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm text-gray-600">Claimed</h3>
            <Package size={16} className="text-gray-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.claimed}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm opacity-90">Claimable</h3>
            <DollarSign size={16} />
          </div>
          <p className="text-xl sm:text-2xl font-bold">{stats.claimableAmount}</p>
        </div>
      </div>

      {/* Batch Claim Section */}
      {stats.matured > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-green-900 mb-1">
                {stats.matured} investment{stats.matured > 1 ? 's' : ''} ready to claim
              </h3>
              <p className="text-sm text-green-700">
                Total claimable: {stats.claimableAmount} tokens
              </p>
            </div>
            
            <div className="flex gap-2">
              {!batchClaimMode ? (
                <button
                  onClick={() => setBatchClaimMode(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm whitespace-nowrap"
                >
                  Claim Multiple
                </button>
              ) : (
                <>
                  <button
                    onClick={selectAllClaimable}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm whitespace-nowrap"
                  >
                    Select All ({stats.matured})
                  </button>
                  <button
                    onClick={handleClaimMultiple}
                    disabled={selectedOrders.size === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    Claim ({selectedOrders.size})
                  </button>
                  <button
                    onClick={() => {
                      setBatchClaimMode(false);
                      setSelectedOrders(new Set());
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Investments Yet</h3>
          <p className="text-gray-600 mb-4">Start staking to earn rewards</p>
          <Link
            href="/dashboard/investments/create"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create First Investment
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.orderId}
              className={`bg-white rounded-lg border p-4 sm:p-6 ${
                batchClaimMode && order.canClaim ? 'cursor-pointer hover:border-blue-500' : ''
              } ${selectedOrders.has(order.orderId) ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => batchClaimMode && order.canClaim && toggleOrderSelection(order.orderId)}
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                {/* Left Side - Order Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold">Order #{order.orderId}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'claimed' ? 'bg-gray-100 text-gray-700' :
                          order.status === 'matured' ? 'bg-green-100 text-green-700' :
                          order.status === 'refunded' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status === 'claimed' ? '✓ Claimed' :
                           order.status === 'matured' ? '🎉 Ready to Claim' :
                           order.status === 'refunded' ? '↩ Refunded' :
                           '⏳ Staking'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Epoch #{order.epochId} • {order.autoReinvest ? 'Auto-reinvest' : 'Manual claim'}
                      </p>
                    </div>
                    
                    {batchClaimMode && order.canClaim && (
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.orderId)}
                        onChange={() => toggleOrderSelection(order.orderId)}
                        className="w-5 h-5"
                      />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Staked Amount</p>
                      <p className="font-bold">{(parseFloat(order.totalAmount) / 1e6).toFixed(2)} {order.token === CONTRACTS.INRT ? 'INRT' : 'USDT'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">APR</p>
                      <p className="font-bold">{(order.apr / 100).toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Interest</p>
                      <p className="font-bold text-green-600">+{order.expectedInterest}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Return</p>
                      <p className="font-bold">{order.expectedTotal}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <Clock size={14} className="text-gray-400" />
                    {order.status === 'active' ? (
                      <span className="text-gray-600">Matures in {order.daysRemaining} days</span>
                    ) : order.status === 'matured' ? (
                      <span className="text-green-600 font-medium">Ready to claim now!</span>
                    ) : (
                      <span className="text-gray-600">Matured on {new Date(order.maturityTime * 1000).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                
                {/* Right Side - Action Button */}
                {!batchClaimMode && order.canClaim && (
                  <div className="flex items-center">
                    <button
                      onClick={() => handleClaimSingle(order.orderId)}
                      disabled={claimingOrderId === order.orderId}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 whitespace-nowrap"
                    >
                      {claimingOrderId === order.orderId ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Claiming...
                        </span>
                      ) : (
                        'Claim Now'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
