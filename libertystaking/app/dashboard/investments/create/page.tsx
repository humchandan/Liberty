'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PACKAGES = [
  { apr: 3, duration: 30, minAmount: 100 },
  { apr: 5, duration: 60, minAmount: 500 },
  { apr: 8, duration: 90, minAmount: 1000 },
  { apr: 12, duration: 180, minAmount: 5000 },
  { apr: 17, duration: 365, minAmount: 10000 },
];

export default function CreateInvestmentPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [selectedPackage, setSelectedPackage] = useState(0);
  const [amount, setAmount] = useState('');
  const [orderCount, setOrderCount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!amount || !orderCount) {
      alert('Please fill all fields');
      return;
    }

    const totalAmount = parseFloat(amount);
    const orders = parseInt(orderCount);
    const pkg = PACKAGES[selectedPackage];

    if (totalAmount < pkg.minAmount) {
      alert(`Minimum investment is ${pkg.minAmount} INRT for this package`);
      return;
    }

    setLoading(true);
    
    // In a real app, this would:
    // 1. Connect to smart contract
    // 2. Check token balance
    // 3. Approve token spending
    // 4. Call stake function
    // 5. Save to database
    
    alert(`Investment Details:
    
Amount: ${totalAmount} INRT
Orders: ${orders}
Amount per order: ${(totalAmount / orders).toFixed(2)} INRT
APR: ${pkg.apr}%
Duration: ${pkg.duration} days
Expected Return: ${(totalAmount * (1 + pkg.apr / 100)).toFixed(2)} INRT

NOTE: This is a demo. In production, this would trigger a smart contract transaction.`);
    
    setLoading(false);
  };

  const selectedPkg = PACKAGES[selectedPackage];
  const totalAmount = parseFloat(amount) || 0;
  const orders = parseInt(orderCount) || 1;
  const amountPerOrder = totalAmount / orders;
  const expectedReturn = totalAmount * (1 + selectedPkg.apr / 100);

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
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Investment</h1>
        <p className="text-gray-600">Choose a staking package and start earning</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-bold mb-4">Select Package</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PACKAGES.map((pkg, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPackage(index)}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedPackage === index
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-3xl font-bold text-blue-600">{pkg.apr}%</p>
                      <p className="text-sm text-gray-600">APR</p>
                    </div>
                    <TrendingUp className="text-blue-600" size={24} />
                  </div>
                  <p className="text-lg font-bold mb-1">{pkg.duration} Days</p>
                  <p className="text-sm text-gray-600">Min: {pkg.minAmount} INRT</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-bold mb-4">Investment Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Investment Amount (INRT) *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Minimum ${selectedPkg.minAmount} INRT`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Orders *
                </label>
                <input
                  type="number"
                  value={orderCount}
                  onChange={(e) => setOrderCount(e.target.value)}
                  placeholder="Enter number of orders"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Amount per order: {amountPerOrder.toFixed(2)} INRT
                </p>
              </div>

              <button
                onClick={handleCreate}
                disabled={loading || !amount || !orderCount}
                className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Create Investment'}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-linear-to-br from-blue-600 to-purple-600 rounded-lg p-6 text-white h-fit sticky top-6">
          <h2 className="text-xl font-bold mb-6">Investment Summary</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm opacity-90">Selected Package</p>
              <p className="text-2xl font-bold">{selectedPkg.apr}% APR</p>
              <p className="text-sm">{selectedPkg.duration} Days</p>
            </div>

            <div className="border-t border-white/20 pt-4">
              <p className="text-sm opacity-90">Investment Amount</p>
              <p className="text-3xl font-bold">{totalAmount.toFixed(2)} INRT</p>
            </div>

            <div className="border-t border-white/20 pt-4">
              <p className="text-sm opacity-90">Number of Orders</p>
              <p className="text-2xl font-bold">{orders}</p>
              <p className="text-sm opacity-90">
                {amountPerOrder.toFixed(2)} INRT per order
              </p>
            </div>

            <div className="border-t border-white/20 pt-4">
              <p className="text-sm opacity-90">Expected Return</p>
              <p className="text-3xl font-bold text-green-300">{expectedReturn.toFixed(2)} INRT</p>
              <p className="text-sm opacity-90">
                Profit: {(expectedReturn - totalAmount).toFixed(2)} INRT
              </p>
            </div>

            <div className="bg-white/20 rounded-lg p-4 mt-6">
              <p className="text-xs opacity-90">
                ⚠️ Demo Mode: This will not create a real blockchain transaction. 
                Smart contract integration required for production.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
