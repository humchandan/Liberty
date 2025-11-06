'use client';
import { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';

interface ContentItem {
  id?: number;
  section: string;
  field: string;
  value: string;
  ord: number;
}

export default function ContentPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSection, setSelectedSection] = useState('features');

  const sections = [
    { id: 'features', name: 'Features' },
    { id: 'roadmap', name: 'Roadmap' },
    { id: 'about', name: 'About/Team' },
    { id: 'faq', name: 'FAQ' },
    { id: 'hero', name: 'Hero Section' },
  ];

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch('/api/landing-content');
      const data = await res.json();
      if (data.success) {
        setContent(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (index: number, field: string, value: string) => {
    const updated = [...content];
    updated[index] = { ...updated[index], [field]: value };
    setContent(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/landing-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: content }),
      });

      const data = await res.json();
      if (data.success) {
        alert('Content updated successfully!');
        await fetchContent();
      }
    } catch (error) {
      console.error('Failed to save content:', error);
      alert('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const filteredContent = content.filter(item => item.section === selectedSection);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Landing Page Content</h1>
          <p className="text-gray-600 mt-1">Edit your landing page text and content</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* Section Tabs */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition ${
                  selectedSection === section.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {section.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Fields */}
        <div className="p-6 space-y-6">
          {filteredContent.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No content found for this section. Add content in the database first.
            </div>
          ) : (
            filteredContent.map((item, index) => {
              const globalIndex = content.findIndex(c => c.id === item.id);
              return (
                <div key={item.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Name
                      </label>
                      <input
                        type="text"
                        value={item.field}
                        onChange={(e) => handleUpdate(globalIndex, 'field', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order
                      </label>
                      <input
                        type="number"
                        value={item.ord}
                        onChange={(e) => handleUpdate(globalIndex, 'ord', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="1"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      value={item.value}
                      onChange={(e) => handleUpdate(globalIndex, 'value', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Changes are saved to the database when you click "Save All Changes"</li>
          <li>• Order numbers determine the display sequence on the landing page</li>
          <li>• Keep your content concise and engaging for better user experience</li>
        </ul>
      </div>
    </div>
  );
}
