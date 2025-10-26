'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useRouter } from 'next/navigation';
import { showSuccess, showError, showLoading, dismissToast } from '@/lib/toast';
import { Plus, Edit, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';

interface Announcement {
  announcementId: number;
  title: string;
  message: string;
  imageUrl: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  expiresAt: string | null;
}

export default function AnnouncementsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    imageUrl: '',
    priority: 0,
    expiresAt: '',
  });

  const isAdmin = user?.walletAddress?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchAnnouncements();
  }, [isAdmin, token]);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/v1/admin/announcements', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.announcements);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const loadingToast = showLoading(editingId ? 'Updating announcement...' : 'Creating announcement...');

    try {
      const url = editingId 
        ? `/api/v1/admin/announcements/${editingId}`
        : '/api/v1/admin/announcements';
      
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      dismissToast(loadingToast);

      if (data.success) {
        showSuccess(editingId ? 'Announcement updated!' : 'Announcement created!');
        setShowForm(false);
        setEditingId(null);
        setFormData({ title: '', message: '', imageUrl: '', priority: 0, expiresAt: '' });
        await fetchAnnouncements();
      } else {
        showError(data.error?.message || 'Failed to save announcement');
      }
    } catch (error: any) {
      dismissToast(loadingToast);
      showError(error.message || 'Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    const loadingToast = showLoading('Updating status...');
    try {
      const res = await fetch(`/api/v1/admin/announcements/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await res.json();
      dismissToast(loadingToast);

      if (data.success) {
        showSuccess('Status updated!');
        await fetchAnnouncements();
      }
    } catch (error) {
      dismissToast(loadingToast);
      showError('Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    const loadingToast = showLoading('Deleting...');
    try {
      const res = await fetch(`/api/v1/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await res.json();
      dismissToast(loadingToast);

      if (data.success) {
        showSuccess('Announcement deleted!');
        await fetchAnnouncements();
      }
    } catch (error) {
      dismissToast(loadingToast);
      showError('Failed to delete announcement');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.announcementId);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      imageUrl: announcement.imageUrl || '',
      priority: announcement.priority,
      expiresAt: announcement.expiresAt || '',
    });
    setShowForm(true);
  };

  if (!isAdmin) return null;

  return (
    <DashboardLayout>
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Manage Announcements</h1>
          <p className="text-sm sm:text-base text-gray-600">Create and manage banner announcements</p>
        </div>
        
        <div className="flex flex-col xs:flex-row gap-2">
          <button
            onClick={fetchAnnouncements}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({ title: '', message: '', imageUrl: '', priority: 0, expiresAt: '' });
            }}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus size={16} />
            New Announcement
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold mb-4">{editingId ? 'Edit' : 'Create'} Announcement</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">Message *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border rounded-lg h-24 sm:h-32 text-sm sm:text-base"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium mb-2">Image URL</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Priority</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border rounded-lg text-sm sm:text-base"
                />
              </div>
            </div>

            <div className="flex flex-col xs:flex-row gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 sm:px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <div key={announcement.announcementId} className="bg-white rounded-lg border p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <h3 className="text-base sm:text-lg font-bold">{announcement.title}</h3>
                  <span className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                    announcement.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {announcement.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500">Priority: {announcement.priority}</span>
                </div>
                <p className="text-sm sm:text-base text-gray-700 mb-2">{announcement.message}</p>
                {announcement.imageUrl && (
                  <img src={announcement.imageUrl} alt="" className="w-24 sm:w-32 h-16 sm:h-20 object-cover rounded mt-2" />
                )}
                <p className="text-[10px] sm:text-xs text-gray-500 mt-2">
                  Created: {new Date(announcement.createdAt).toLocaleString()}
                  {announcement.expiresAt && ` • Expires: ${new Date(announcement.expiresAt).toLocaleString()}`}
                </p>
              </div>

              <div className="flex sm:flex-col gap-2">
                <button
                  onClick={() => handleToggleActive(announcement.announcementId, announcement.isActive)}
                  className="p-2 hover:bg-gray-100 rounded"
                  title={announcement.isActive ? 'Deactivate' : 'Activate'}
                >
                  {announcement.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <button
                  onClick={() => handleEdit(announcement)}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(announcement.announcementId)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
