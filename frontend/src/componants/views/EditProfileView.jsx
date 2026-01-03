import React, { useState, useRef } from 'react';
import { ArrowLeftIcon, CameraIcon } from '../ui/Icons';
import * as base44 from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function EditProfileView({ user, onBack, onSave }) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    handle: user?.handle || user?.email?.split('@')[0] || '',
    bio: user?.bio || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let avatarUrl = user?.avatar;

      if (avatarFile) {
        const uploadResult = await base44.integrations.Core.UploadFile({ file: avatarFile });
        avatarUrl = uploadResult.file_url;
      }

      const updatedData = {
        ...formData,
        avatar: avatarUrl,
      };

      await base44.auth.updateMe(updatedData);
      onSave?.(updatedData);
      onBack?.();
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          Save
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <img
              src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name || 'User')}&background=6366f1&color=fff&size=128`}
              alt="Profile"
              className="w-28 h-28 rounded-full object-cover ring-4 ring-indigo-100"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-lg"
            >
              <CameraIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-3">Tap to change photo</p>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Your display name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              <input
                type="text"
                value={formData.handle}
                onChange={(e) => setFormData({ ...formData, handle: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
              placeholder="Tell everyone about yourself..."
              maxLength={160}
            />
            <p className="text-xs text-gray-400 text-right mt-1">
              {formData.bio.length}/160
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}