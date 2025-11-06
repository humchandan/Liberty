'use client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Home, Image as ImageIcon, FileText, Users, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-br from-blue-600 to-purple-700 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-blue-100 mt-1">Liberty Finance</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <Home size={20} />
            Dashboard
          </Link>
          <Link href="/admin/banners" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <ImageIcon size={20} />
            Banner Ads
          </Link>
          <Link href="/admin/content" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <FileText size={20} />
            Landing Content
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <Users size={20} />
            Users
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="mb-3 text-sm">
            <div className="font-semibold">{user?.walletAddress?.substring(0, 6)}...{user?.walletAddress?.substring(38)}</div>
            <div className="text-blue-100">{user?.email || 'Admin'}</div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
