'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/lib/auth-context';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-blue-600">Liberty Finance</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {isAuthenticated && user && (
              <div className="text-sm hidden md:block">
                <p className="font-medium">{user.fullName || 'User'}</p>
                <p className="text-gray-500 text-xs">{user.customReferralCode}</p>
              </div>
            )}
            
            <ConnectButton />
            
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
