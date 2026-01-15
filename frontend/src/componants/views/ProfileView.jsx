import React, { useState, useEffect } from 'react';
import { CogIcon, CheckBadgeIcon, CameraIcon } from '../ui/Icons';
import api from '../../api/apiClient';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProfileView({ user, onEditProfile, onSettingsClick }) {
  const [userPosts, setUserPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    loadUserPosts();
  }, [user?.email]);

  const loadUserPosts = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      const posts = await []; // TODO: Replace with api.posts.getUserPosts(user?.email) when endpoint is ready
      setUserPosts(posts || []);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    posts: userPosts.length,
    followers: user?.followers_count || 1247,
    following: user?.following_count || 524,
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <button className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors">
          <CameraIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Info */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="absolute -top-16 left-6">
          <div className="relative">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff&size=128`}
              alt={user?.full_name}
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
            />
            <button 
              onClick={onEditProfile}
              className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-lg"
            >
              <CameraIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 gap-2">
          <button
            onClick={onSettingsClick}
            className={`p-2.5 rounded-xl transition-colors ${
              isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CogIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onEditProfile}
            className={`px-5 py-2 border-2 font-semibold rounded-xl transition-colors ${
              isDarkMode 
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t('editProfile')}
          </button>
        </div>

        {/* Name & Bio */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>{user?.full_name || 'User'}</h1>
            {user?.verified && <CheckBadgeIcon className="w-6 h-6 text-indigo-500" />}
          </div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            @{user?.handle || user?.email?.split('@')[0]}
          </p>
          <p className={`mt-3 leading-relaxed ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {user?.bio || t('defaultBio')}
          </p>
        </div>

        {/* Stats */}
        <div className={`flex items-center gap-8 mt-6 py-4 border-y ${
          isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
          <div className="text-center">
            <p className={`text-2xl font-bold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>{stats.posts}</p>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>{t('posts')}</p>
          </div>
          <div className="text-center cursor-pointer hover:opacity-70 transition-opacity">
            <p className={`text-2xl font-bold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>{stats.followers.toLocaleString()}</p>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>{t('followers')}</p>
          </div>
          <div className="text-center cursor-pointer hover:opacity-70 transition-opacity">
            <p className={`text-2xl font-bold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>{stats.following.toLocaleString()}</p>
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>{t('following')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex mt-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
          {['posts', 'media', 'likes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors relative ${
                activeTab === tab ? 'text-indigo-600' : 
                  isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(tab)}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : userPosts.length === 0 ? (
            <div className={`text-center py-12 ${
              isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-600'
            }`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <CameraIcon className={`w-8 h-8 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
              </div>
              <h3 className={`text-lg font-semibold mb-1 ${
                isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>{t('noPosts')}</h3>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                {t('noPostsMessage')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  className={`aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}
                >
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-indigo-100 to-purple-100">
                      <p className={`text-xs line-clamp-4 text-center ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>{post.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}