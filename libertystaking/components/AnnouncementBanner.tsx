'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Announcement {
  announcementId: number;
  title: string;
  message: string;
  imageUrl: string | null;
  priority: number;
}

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    try {
      const res = await fetch('/api/v1/announcements/active');
      const data = await res.json();
      
      if (data.success && data.announcement) {
        // Check if user already dismissed this announcement
        const dismissedId = localStorage.getItem('dismissedAnnouncement');
        if (dismissedId !== String(data.announcement.announcementId)) {
          setAnnouncement(data.announcement);
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch announcement:', error);
    }
  };

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem('dismissedAnnouncement', String(announcement.announcementId));
      setIsVisible(false);
      setTimeout(() => setIsDismissed(true), 300);
    }
  };

  if (!announcement || isDismissed) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleDismiss}
    >
      <div
        className={`bg-white rounded-2xl max-w-2xl w-full shadow-2xl transform transition-all duration-300 ${
          isVisible ? 'scale-100' : 'scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
        >
          <X size={20} className="text-gray-600" />
        </button>

        {/* Image */}
        {announcement.imageUrl && (
          <div className="w-full h-48 overflow-hidden rounded-t-2xl">
            <img
              src={announcement.imageUrl}
              alt={announcement.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {announcement.title}
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            {announcement.message}
          </p>

          <button
            onClick={handleDismiss}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
