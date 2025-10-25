'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { ArrowLeft, User, Mail, Phone, MapPin } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';
import { ContractService } from '@/lib/contracts';

export default function SignupPage() {
  const { isAuthenticated } = useAuth();
  const { address, isConnected } = useAccount();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    address: '',
    zipCode: '',
    country: '',
    referrerCode: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Get referrer code from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref) {
      setFormData(prev => ({ ...prev, referrerCode: ref }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!formData.fullName || !formData.email || !formData.mobileNumber || !formData.address || !formData.zipCode) {
      setError('All fields except country and referrer code are required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Step 1: Register user in database
      const dbToast = showLoading('Creating your account...');
      
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
          referrerCode: formData.referrerCode || undefined,
          userData: {
            fullName: formData.fullName,
            email: formData.email,
            mobileNumber: formData.mobileNumber,
            address: formData.address,
            zipCode: formData.zipCode,
            country: formData.country || undefined,
          },
        }),
      });

      const data = await response.json();
      dismissToast(dbToast);

      if (!data.success) {
        setError(data.error?.message || 'Signup failed');
        showError(data.error?.message || 'Signup failed');
        setIsLoading(false);
        return;
      }

      // Step 2: Set referrer on smart contract (if provided)
      if (formData.referrerCode && window.ethereum) {
        const contractToast = showLoading('Setting referrer on blockchain...');
        
        try {
          const contractService = new ContractService(window.ethereum);
          
          // Check if referrer already set
          const existingReferrer = await contractService.getUserReferrer(address);
          
          if (existingReferrer === '0x0000000000000000000000000000000000000000') {
            // Referrer not set, set it now
            const setRefTx = await contractService.setReferrer(formData.referrerCode);
            dismissToast(contractToast);
            
            const waitToast = showLoading('Waiting for blockchain confirmation...');
            await setRefTx.wait();
            dismissToast(waitToast);
            
            showSuccess('Referrer set successfully on blockchain! 🎉');
          } else {
            dismissToast(contractToast);
            console.log('✅ Referrer already set:', existingReferrer);
          }
        } catch (contractError: any) {
          dismissToast(contractToast);
          console.error('Failed to set referrer on contract:', contractError);
          // Don't fail signup if contract call fails - user can set it later
          showError('Account created but referrer not set on blockchain. You can set it when staking.');
        }
      }

      // Success!
      showSuccess(`Welcome to Liberty Finance! 🚀\nReferral Code: ${data.user.customReferralCode}`);
      
      // Store auth data
      localStorage.setItem('liberty_token', data.token);
      localStorage.setItem('liberty_user', JSON.stringify(data.user));
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('Signup error:', error);
      setError('Network error. Please try again.');
      showError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Join <span className="text-blue-600">Liberty Finance</span>
          </h1>
          <p className="text-lg text-gray-600">
            Complete your profile to start staking and earning
          </p>
          
          {formData.referrerCode && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800">
                🎁 You're joining with a referral code!
              </p>
              <p className="text-xs text-green-600 mt-1 font-mono break-all">
                {formData.referrerCode}
              </p>
            </div>
          )}
        </div>

        {/* Wallet Connection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">1. Connect Your Wallet</h2>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
          {address && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-6">2. Complete Your Profile</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="tel"
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+1234567890"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your country"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full address"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="12345"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referrer Code (Optional)
                </label>
                <input
                  type="text"
                  name="referrerCode"
                  value={formData.referrerCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter referrer code"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!isConnected || isLoading}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
