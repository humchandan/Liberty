'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useSignMessage } from 'wagmi';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, setAuthData, isLoading: authLoading } = useAuth();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async () => {
    if (!address || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Requesting nonce...');
      const nonceRes = await fetch('/api/v1/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      
      const nonceData = await nonceRes.json();
      console.log('Nonce received:', nonceData);

      if (!nonceData.success) {
        throw new Error('Failed to get nonce');
      }

      console.log('Signing message...');
      const signature = await signMessageAsync({ message: nonceData.nonce });
      console.log('Signature received');

      console.log('Verifying signature...');
      const verifyRes = await fetch('/api/v1/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          signature,
          nonce: nonceData.nonce,
        }),
      });

      const verifyData = await verifyRes.json();
      console.log('Verify response:', verifyData);

      if (verifyData.success && !verifyData.user.isNewUser) {
        const profileRes = await fetch('/api/v1/users/profile', {
          headers: {
            'Authorization': `Bearer ${verifyData.token}`,
          },
        });
        
        const profileData = await profileRes.json();
        
        if (profileData.success) {
          setAuthData(profileData.user, verifyData.token);
          router.push('/dashboard');
        }
      } else if (verifyData.user?.isNewUser) {
        alert('New user detected! Please complete signup.');
        router.push('/signup');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      alert(`Login failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-20">
        <div className="text-center">
          <h1 className="text-3xl xs:text-4xl sm:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
            Welcome to <span className="text-blue-600">Liberty Finance</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-600 mb-8 sm:mb-12 px-4">
            Stake INRT tokens and earn up to 17% APR
          </p>
          
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <ConnectButton />
            
            {isConnected && !isAuthenticated && (
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-base sm:text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
                <ArrowRight size={18} className="sm:w-5 sm:h-5" />
              </button>
            )}
          </div>

          <div className="mt-12 sm:mt-16 lg:mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Stake & Earn</h3>
              <p className="text-sm sm:text-base text-gray-600">Stake your INRT tokens and earn competitive APR</p>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Refer & Earn</h3>
              <p className="text-sm sm:text-base text-gray-600">Earn up to 15% referral rewards on 15 levels</p>
            </div>
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-md sm:col-span-2 md:col-span-1">
              <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Track Progress</h3>
              <p className="text-sm sm:text-base text-gray-600">Monitor your investments and team growth</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
