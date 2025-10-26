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
  DollarSign,
  Wallet,
  Bell
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  const navItems = [
    { 
      href: '/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      adminOnly: false 
    },
    { 
      href: '/dashboard/investments', 
      label: 'My Investments', 
      icon: TrendingUp,
      adminOnly: false 
    },
    { 
      href: '/dashboard/referrals', 
      label: 'Referrals', 
      icon: Users,
      adminOnly: false 
    },
    { 
      href: '/dashboard/referrals/claim', 
      label: 'Claim Rewards', 
      icon: DollarSign,
      adminOnly: false 
    },
    { 
      href: '/dashboard/profile', 
      label: 'Profile', 
      icon: User,
      adminOnly: false 
    },
  ];

  const adminNavItems = [
  { 
    href: '/dashboard/admin/controls', 
    label: 'Admin Controls', 
    icon: Shield 
  },
  { 
    href: '/dashboard/admin/payouts', 
    label: 'Process Payouts', 
    icon: Wallet 
  },
  { 
    href: '/dashboard/admin/announcements', 
    label: 'Announcements', 
    icon: Bell  // ✅ Add Bell icon import
  },
];
  return (
    <aside className="w-64 bg-white border-r min-h-screen p-6">
      <nav className="space-y-2">
        {/* Regular User Navigation */}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
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

        {/* Admin Section */}
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

      {/* User Info at Bottom */}
      <div className="mt-auto pt-6 border-t">
        <div className="px-4">
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
      </div>
    </aside>
  );
}
