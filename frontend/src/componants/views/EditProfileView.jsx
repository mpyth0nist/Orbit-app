import React, { useState, useRef } from 'react';
import { ArrowLeftIcon, CameraIcon } from '../ui/Icons';
import { usersAPI, mediaAPI, getMediaUrl } from '../../api/apiClient';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function EditProfileView({ user, onBack, onSave }) {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || user?.profile?.firstName || '',
    lastName: user?.lastName || user?.profile?.lastName || '',
    bio: user?.bio || user?.profile?.bio || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(
    getMediaUrl(user?.photoUrl || user?.profile?.photoUrl) || null
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const fileInputRef = useRef(null);

  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  // Get display name for avatar fallback
  const getDisplayName = () => {
    return `${formData.firstName} ${formData.lastName}`.trim() || 'User';
  };

  // Handle avatar file selection
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      setAvatarFile(file);
      setError(null);

      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload profile picture
  const uploadProfilePicture = async () => {
    if (!avatarFile) return null;

    setIsUploadingPhoto(true);
    try {
      const response = await mediaAPI.uploadProfilePicture(avatarFile);
      // Handle response format: { photoUrl } or nested { data: { photoUrl } }
      const photoUrl = response?.photoUrl || response?.data?.photoUrl;
      return photoUrl;
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      throw new Error(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Update profile info
  const updateProfileInfo = async () => {
    try {
      const response = await usersAPI.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        bio: formData.bio.trim()
      });
      return response?.profile || response?.data?.profile;
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw new Error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let newPhotoUrl = null;

      // Upload new profile picture if selected
      if (avatarFile) {
        newPhotoUrl = await uploadProfilePicture();
      }

      // Update profile info
      await updateProfileInfo();

      // Build updated user data for parent callback
      const updatedData = {
        ...user,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        bio: formData.bio.trim(),
        profile: {
          ...user?.profile,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          bio: formData.bio.trim(),
          ...(newPhotoUrl && { photoUrl: newPhotoUrl })
        },
        ...(newPhotoUrl && { photoUrl: newPhotoUrl })
      };

      setSuccessMessage('Profile updated successfully!');
      setAvatarFile(null); // Clear pending file

      // Notify parent after short delay to show success
      setTimeout(() => {
        onSave?.(updatedData);
        onBack?.();
      }, 500);

    } catch (err) {
      setError(err.message || 'Failed to update profile');
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
            className={`p-2 -ml-2 rounded-xl transition-colors ${isDarkMode
              ? 'text-gray-300 hover:bg-gray-700'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <h1 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>{t('editProfile') || 'Edit Profile'}</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('saving') || 'Saving...'}
            </>
          ) : successMessage ? (
            <>
              <Check className="w-4 h-4" />
              {t('saved') || 'Saved!'}
            </>
          ) : (
            t('save') || 'Save'
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
          }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-600'
          }`}>
          <Check className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{successMessage}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className={`rounded-3xl p-6 shadow-sm border ${isDarkMode
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-100'
        }`}>
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <img
              src={avatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName())}&background=6366f1&color=fff&size=128`}
              alt="Profile"
              className={`w-28 h-28 rounded-full object-cover ring-4 ${isDarkMode ? 'ring-gray-700' : 'ring-indigo-100'
                } ${isUploadingPhoto ? 'opacity-50' : ''}`}
            />
            {isUploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            )}
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
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 p-2.5 bg-blue-400 text-white rounded-full hover:bg-blue-500 transition-colors shadow-lg disabled:opacity-50"
            >
              <CameraIcon className="w-5 h-5" />
            </button>
          </div>
          <p className={`text-sm mt-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>{t('tapToChangePhoto') || 'Tap to change photo'}</p>
          {avatarFile && (
            <p className="text-xs text-indigo-500 mt-1">
              New photo selected - will upload on save
            </p>
          )}
        </div>

        {/* Fields */}
        <div className="space-y-5">
          {/* First Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
              {t('firstName') || 'First Name'}
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isDarkMode
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              placeholder={t('firstNamePlaceholder') || 'Your first name'}
              maxLength={50}
            />
          </div>

          {/* Last Name */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
              {t('lastName') || 'Last Name'}
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isDarkMode
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              placeholder={t('lastNamePlaceholder') || 'Your last name'}
              maxLength={50}
            />
          </div>

          {/* Bio */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
              {t('bio') || 'Bio'}
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all ${isDarkMode
                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                }`}
              placeholder={t('bioPlaceholder') || 'Tell everyone about yourself...'}
              maxLength={160}
            />
            <p className={`text-xs text-right mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`}>
              {formData.bio.length}/160
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}