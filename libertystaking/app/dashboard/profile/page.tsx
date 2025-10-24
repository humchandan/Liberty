'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { User, Mail, Phone, MapPin, Calendar, Link as LinkIcon, Copy, CheckCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, token } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/v1/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setProfileData(data.user);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signup?ref=${profileData?.customReferralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(profileData?.customReferralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-white rounded-lg border p-6">
          <h2 className="text-xl font-bold mb-6">Personal Information</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                  <User size={16} /> Full Name
                </label>
                <p className="font-medium text-lg">{profileData?.fullName}</p>
              </div>

              <div>
                <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                  <Mail size={16} /> Email
                </label>
                <p className="font-medium text-lg">{profileData?.email}</p>
                {profileData?.emailVerified ? (
                  <span className="text-xs text-green-600">✓ Verified</span>
                ) : (
                  <span className="text-xs text-orange-600">⚠ Not verified</span>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                  <Phone size={16} /> Mobile Number
                </label>
                <p className="font-medium text-lg">{profileData?.mobileNumber}</p>
                {profileData?.mobileVerified ? (
                  <span className="text-xs text-green-600">✓ Verified</span>
                ) : (
                  <span className="text-xs text-orange-600">⚠ Not verified</span>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                  <MapPin size={16} /> Country
                </label>
                <p className="font-medium text-lg">{profileData?.country || 'Not specified'}</p>
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                <MapPin size={16} /> Address
              </label>
              <p className="font-medium">{profileData?.address}</p>
              <p className="font-medium text-gray-600">ZIP: {profileData?.zipCode}</p>
            </div>

            <div>
              <label className="text-sm text-gray-600 flex items-center gap-2 mb-1">
                <Calendar size={16} /> Member Since
              </label>
              <p className="font-medium">
                {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'Unknown'}
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-600 mb-1">Wallet Address</label>
              <p className="font-mono text-sm bg-gray-100 p-3 rounded-lg break-all">
                {profileData?.walletAddress}
              </p>
            </div>
          </div>
        </div>

        {/* Referral Info Card */}
        <div className="space-y-6">
          <div className="bg-linear-to-br from-blue-600 to-purple-600 rounded-lg p-6 text-white">
            <h2 className="text-xl font-bold mb-4">Referral Code</h2>
            
            <div className="bg-white/20 backdrop-blur rounded-lg p-4 mb-3">
              <p className="text-sm opacity-90 mb-2">Your Code</p>
              <div className="flex items-center justify-between">
                <code className="text-xl font-bold">{profileData?.customReferralCode}</code>
                <button
                  onClick={copyReferralCode}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30"
                >
                  {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <button
              onClick={copyReferralLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-medium"
            >
              <LinkIcon size={20} />
              {copied ? 'Link Copied!' : 'Copy Referral Link'}
            </button>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-bold mb-4">Account Status</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Profile Completed</span>
                <span className="text-green-600 font-medium">✓ Yes</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Email Verified</span>
                <span className={profileData?.emailVerified ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                  {profileData?.emailVerified ? '✓ Yes' : '⚠ No'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Mobile Verified</span>
                <span className={profileData?.mobileVerified ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>
                  {profileData?.mobileVerified ? '✓ Yes' : '⚠ No'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
