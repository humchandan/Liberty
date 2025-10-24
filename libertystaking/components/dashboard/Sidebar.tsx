'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  User, 
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/investments', icon: TrendingUp, label: 'Investments' },
  { href: '/dashboard/referrals', icon: Users, label: 'Referrals' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
];

const adminMenuItem = { 
  href: '/dashboard/admin', 
  icon: Shield, 
  label: 'Admin Panel' 
};

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Check if user is admin (you can store this in user object)
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
        
        {isAdmin && (
          <>
            <div className="border-t my-2 pt-2">
              <Link
                href={adminMenuItem.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === adminMenuItem.href
                    ? 'bg-red-50 text-red-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <adminMenuItem.icon size={20} />
                {adminMenuItem.label}
              </Link>
            </div>
          </>
        )}
      </nav>
    </aside>
  );
}
