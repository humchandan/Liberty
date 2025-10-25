'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  User, 
  Settings,
  Shield,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/investments', icon: TrendingUp, label: 'Investments' },
  { href: '/dashboard/referrals', icon: Users, label: 'Referrals' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  return (
    <aside className="w-64 bg-white border-r min-h-[calc(100vh-4rem)] hidden md:block">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}

        {/* Claim Rewards Link - Only show if user has referrals */}
        <Link
          href="/dashboard/referrals/claim"
          className={`flex items-center gap-3 px-4 py-3 ml-4 rounded-lg transition-colors ${
            pathname === '/dashboard/referrals/claim'
              ? 'bg-green-50 text-green-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <DollarSign size={20} />
          <span className="font-medium">Claim Rewards</span>
        </Link>
        
        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="pt-4 mt-4 border-t">
              <p className="text-xs font-semibold text-gray-400 uppercase px-4 mb-2">Admin</p>
            </div>
            
            <Link
              href="/dashboard/admin"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/dashboard/admin'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Shield size={20} />
              <span className="font-medium">Admin Panel</span>
            </Link>
            
            <Link
              href="/dashboard/admin/controls"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/dashboard/admin/controls'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings size={20} />
              <span className="font-medium">Admin Controls</span>
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
