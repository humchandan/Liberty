'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ContractService } from '@/lib/contracts';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';
import { DollarSign, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface MaturedOrder {
  investmentId: number;
  orderId: number;
  userId: number;
  walletAddress: string;
  tokenSymbol: string;
  totalAmount: string;
  orderCount: number;
  paidOrderCount: number;
  maturityDate: string;
  status: string;
}

export default function AdminPayoutsPage() {
  const { user, token } = useAuth();
  const { address } = useAccount();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [maturedOrders, setMaturedOrders] = useState<MaturedOrder[]>([]);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(null);

  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchMaturedOrders();
  }, [isAdmin]);

  const fetchMaturedOrders = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/v1/admin/matured-orders', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMaturedOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch matured orders:', error);
      showError('Failed to load matured orders');
    } finally {
      setRefreshing(false);
    }
  };

  const handlePayOrder = async (orderId: number) => {
    if (!window.ethereum) {
      showError('Please connect your wallet');
      return;
    }

    setProcessingOrderId(orderId);
    const loadingToast = showLoading(`Processing payout for Order #${orderId}...`);

    try {
      const contractService = new ContractService(window.ethereum);
      const tx = await contractService.payOrder(orderId);
      dismissToast(loadingToast);
      
      const waitToast = showLoading('Waiting for confirmation...');
      await tx.wait();
      dismissToast(waitToast);
      
      showSuccess(`Order #${orderId} paid successfully! 🎉`);
      await fetchMaturedOrders();
    } catch (error: any) {
      dismissToast(loadingToast);
      console.error('Payout error:', error);
      showError(error.message || 'Failed to process payout');
    } finally {
      setProcessingOrderId(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Payouts</h1>
          <p className="text-gray-600">Process matured investment payouts</p>
        </div>
        
        <button
          onClick={fetchMaturedOrders}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm opacity-90">Pending Payouts</h3>
            <Clock size={24} />
          </div>
          <p className="text-4xl font-bold">{maturedOrders.length}</p>
          <p className="text-sm opacity-90 mt-1">Orders ready for payout</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm opacity-90">Total Amount</h3>
            <DollarSign size={24} />
          </div>
          <p className="text-4xl font-bold">
            {maturedOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0).toFixed(2)}
          </p>
          <p className="text-sm opacity-90 mt-1">INRT to be paid</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm opacity-90">Processed Today</h3>
            <CheckCircle size={24} />
          </div>
          <p className="text-4xl font-bold">0</p>
          <p className="text-sm opacity-90 mt-1">Orders paid</p>
        </div>
      </div>

      {/* Matured Orders List */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Matured Orders Awaiting Payout</h2>
        </div>
        
        {maturedOrders.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-600">No pending payouts at the moment</p>
          </div>
        ) : (
          <div className="divide-y">
            {maturedOrders.map((order) => (
              <div key={order.investmentId} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">Order #{order.orderId}</h3>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                        Matured
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">User</p>
                        <p className="font-medium font-mono">{order.walletAddress.slice(0, 10)}...</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Amount</p>
                        <p className="font-bold text-green-600">{order.totalAmount} {order.tokenSymbol}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Orders Paid</p>
                        <p className="font-medium">{order.paidOrderCount} / {order.orderCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Matured On</p>
                        <p className="font-medium">{new Date(order.maturityDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePayOrder(order.orderId)}
                    disabled={processingOrderId === order.orderId}
                    className="ml-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                  >
                    {processingOrderId === order.orderId ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Process Payout'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
