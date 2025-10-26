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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Announcements</h1>
          <p className="text-gray-600">Create and manage banner announcements</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={fetchAnnouncements}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            New Announcement
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg border p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit' : 'Create'} Announcement</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Message *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg h-32"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
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
          <div key={announcement.announcementId} className="bg-white rounded-lg border p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold">{announcement.title}</h3>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    announcement.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {announcement.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-sm text-gray-500">Priority: {announcement.priority}</span>
                </div>
                <p className="text-gray-700 mb-2">{announcement.message}</p>
                {announcement.imageUrl && (
                  <img src={announcement.imageUrl} alt="" className="w-32 h-20 object-cover rounded mt-2" />
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Created: {new Date(announcement.createdAt).toLocaleString()}
                  {announcement.expiresAt && ` • Expires: ${new Date(announcement.expiresAt).toLocaleString()}`}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleActive(announcement.announcementId, announcement.isActive)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  {announcement.isActive ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <button
                  onClick={() => handleEdit(announcement)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => handleDelete(announcement.announcementId)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
