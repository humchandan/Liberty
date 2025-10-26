'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  User, 
  DollarSign,
  Shield,
  Wallet,
  Bell,
  Settings,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/investments', label: 'My Investments', icon: TrendingUp },
    { href: '/dashboard/referrals', label: 'Referrals', icon: Users },
    { href: '/dashboard/referrals/claim', label: 'Claim Rewards', icon: DollarSign },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
  ];

  const adminNavItems = [
    { href: '/dashboard/admin', label: 'Admin Dashboard', icon: Shield },
    { href: '/dashboard/admin/controls', label: 'Admin Controls', icon: Settings },
    { href: '/dashboard/admin/treasury', label: 'Treasury', icon: Wallet },
    { href: '/dashboard/admin/payouts', label: 'Process Payouts', icon: DollarSign },
    { href: '/dashboard/admin/announcements', label: 'Announcements', icon: Bell },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-screen
      `}>
        {/* Close Button (Mobile Only) */}
        <div className="lg:hidden flex justify-end p-4">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-6 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">
                  Admin
                </p>
              </div>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      pathname === item.href
                        ? 'bg-red-50 text-red-600 font-medium'
                        : 'text-gray-700 hover:bg-red-50 hover:text-red-600'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User Info */}
        <div className="p-6 border-t">
          <p className="text-xs text-gray-600">Logged in as</p>
          <p className="text-sm font-medium text-gray-900 truncate mt-1">
            {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'User'}
          </p>
          {isAdmin && (
            <span className="inline-block mt-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
              Admin
            </span>
          )}
        </div>
      </aside>
    </>
  );
}
