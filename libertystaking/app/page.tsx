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
      // Step 1: Request nonce
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

      // Step 2: Sign message
      console.log('Signing message...');
      const signature = await signMessageAsync({ message: nonceData.nonce });
      console.log('Signature received');

      // Step 3: Verify signature
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
        // Existing user - fetch profile
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
        // New user - need to signup
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

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-blue-600">Liberty Finance</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Stake INRT tokens and earn up to 17% APR
          </p>
          
          <div className="flex flex-col items-center gap-4">
            <ConnectButton />
            
            {isConnected && !isAuthenticated && (
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In to Dashboard'}
                <ArrowRight size={20} />
              </button>
            )}
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-4">Stake & Earn</h3>
              <p className="text-gray-600">Stake your INRT tokens and earn competitive APR</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-4">Refer & Earn</h3>
              <p className="text-gray-600">Earn up to 15% referral rewards on 15 levels</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md">
              <h3 className="text-2xl font-bold mb-4">Track Progress</h3>
              <p className="text-gray-600">Monitor your investments and team growth</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
