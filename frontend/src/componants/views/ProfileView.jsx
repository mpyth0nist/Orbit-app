import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CogIcon, CheckBadgeIcon, CameraIcon, ImageIcon, HeartIcon } from '../ui/Icons';
import PostCard from '../feed/PostCard';
import FollowersModal from '../ui/FollowersModal';
import api, { usersAPI, getMediaUrl } from '../../api/apiClient';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

const ProfileView = forwardRef(function ProfileView({
  user,
  onEditProfile,
  onSettingsClick,
  onPostClick,  // Callback for post click navigation
  userPosts = [],
  isLoading = true,
  isVisible = true  // Whether this view is currently visible/active
}, ref) {
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState({ followers: 0, following: 0, threads: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [modalType, setModalType] = useState(null); // 'followers' or 'following'

  // Tab content state
  const [likedPosts, setLikedPosts] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [tabError, setTabError] = useState(null);

  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // State for optimistic updates on userPosts (received as prop, but we track changes locally)
  const [localUserPosts, setLocalUserPosts] = useState(userPosts);

  // Sync localUserPosts when userPosts prop changes
  React.useEffect(() => {
    setLocalUserPosts(userPosts);
  }, [userPosts]);

  // Like mutation with optimistic updates
  const likeMutation = useMutation({
    mutationFn: (post) => api.reactions.toggle('thread', post.id),
    onMutate: (postToLike) => {
      // Optimistically update local state
      setLocalUserPosts(prev => prev.map(p =>
        p.id === postToLike.id
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? (p.likesCount || 1) - 1 : (p.likesCount || 0) + 1 }
          : p
      ));
      setLikedPosts(prev => prev.map(p =>
        p.id === postToLike.id
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? (p.likesCount || 1) - 1 : (p.likesCount || 0) + 1 }
          : p
      ));
    },
    onError: (err, postToLike) => {
      // Rollback on error
      setLocalUserPosts(prev => prev.map(p =>
        p.id === postToLike.id
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? (p.likesCount || 0) + 1 : (p.likesCount || 1) - 1 }
          : p
      ));
      setLikedPosts(prev => prev.map(p =>
        p.id === postToLike.id
          ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? (p.likesCount || 0) + 1 : (p.likesCount || 1) - 1 }
          : p
      ));
    },
  });

  const handleLike = (post) => {
    // Prevent liking own post
    if (currentUser?.id === post.user?.id || currentUser?.id === post.userId) {
      return;
    }
    likeMutation.mutate(post);
  };

  const loadUserStats = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingStats(true);
    try {
      const statsResponse = await api.users.getStats();
      const stats = statsResponse?.data || statsResponse;
      setUserStats({
        followers: stats.followers || 0,
        following: stats.following || 0,
        threads: stats.posts || stats.threads || 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [user?.id]);

  // Load tab content based on active tab
  const loadTabContent = useCallback(async (tab) => {
    if (tab === 'posts') return; // Posts are passed as prop

    setIsLoadingTab(true);
    setTabError(null);

    try {
      if (tab === 'likes') {
        const response = await usersAPI.getMyLikedPosts({ page: 1, limit: 50 });
        const data = response?.data || response || [];
        setLikedPosts(Array.isArray(data) ? data : []);
      } else if (tab === 'media') {
        const response = await usersAPI.getMyMedia({ page: 1, limit: 50 });
        const data = response?.data || response || [];
        setMediaItems(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error(`Failed to load ${tab}:`, error);
      setTabError(`Failed to load ${tab}`);
    } finally {
      setIsLoadingTab(false);
    }
  }, []);

  // Expose refreshStats method to parent
  useImperativeHandle(ref, () => ({
    refreshStats: loadUserStats
  }), [loadUserStats]);

  // Load stats on mount
  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  // Refresh stats when view becomes visible (tab switch, navigation back)
  useEffect(() => {
    if (isVisible) {
      loadUserStats();
    }
  }, [isVisible, loadUserStats]);

  // Load content when tab changes
  useEffect(() => {
    loadTabContent(activeTab);
  }, [activeTab, loadTabContent]);

  const stats = {
    posts: userStats.threads,
    followers: userStats.followers,
    following: userStats.following,
  };

  // Render content based on active tab
  const renderTabContent = () => {
    if (isLoadingTab) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      );
    }

    if (tabError) {
      return (
        <div className={`text-center py-12 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
          <p>{tabError}</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'posts':
        if (isLoading) {
          return (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          );
        }
        if (localUserPosts.length === 0) {
          return (
            <div className={`text-center py-12 ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-600'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <CameraIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{t('noPosts')}</h3>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{t('noPostsMessage')}</p>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {localUserPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => {
                  if (onPostClick) {
                    onPostClick(post);
                  } else {
                    navigate(`/thread/${post.id}`);
                  }
                }}
                onLike={handleLike}
                isLiked={post.isLiked}
                isOwnPost={currentUser?.id === post.user?.id || currentUser?.id === post.userId}
              />
            ))}
          </div>
        );

      case 'likes':
        if (likedPosts.length === 0) {
          return (
            <div className={`text-center py-12 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <HeartIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {t('noLikes') || 'No liked posts yet'}
              </h3>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                {t('noLikesMessage') || 'Posts you like will appear here'}
              </p>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {likedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onClick={() => {
                  if (onPostClick) {
                    onPostClick(post);
                  } else {
                    navigate(`/thread/${post.id}`);
                  }
                }}
                onLike={handleLike}
                isLiked={true}
                isOwnPost={currentUser?.id === post.user?.id || currentUser?.id === post.userId}
              />
            ))}
          </div>
        );

      case 'media':
        if (mediaItems.length === 0) {
          return (
            <div className={`text-center py-12 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <ImageIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {t('noMedia') || 'No media yet'}
              </h3>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                {t('noMediaMessage') || 'Photos and videos you post will appear here'}
              </p>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
            {mediaItems.map((item) => (
              <div
                key={item.id}
                className="aspect-square relative cursor-pointer group overflow-hidden"
                onClick={() => {
                  // Navigate to the associated thread
                  const threadId = item.thread?.id || item.threadId;
                  if (threadId) {
                    navigate(`/thread/${threadId}`);
                  }
                }}
              >
                <img
                  src={getMediaUrl(item.url)}
                  alt="Media"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  {item.thread && (
                    <div className="text-white text-xs font-medium px-2 py-1 bg-black/50 rounded-full">
                      View Post
                    </div>
                  )}
                </div>
                {item.type === 'VIDEO' && (
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                    Video
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
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
              src={getMediaUrl(user?.photoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User')}&background=6366f1&color=fff&size=128`}
              alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onEditProfile}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all"
          >
            {t('editProfile')}
          </button>
          <button
            onClick={onSettingsClick}
            className={`p-2.5 rounded-xl transition-colors ${isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <CogIcon className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}</h1>
            {user?.verified && <CheckBadgeIcon className="w-6 h-6 text-indigo-500" />}
          </div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            @{user?.username || user?.email?.split('@')[0]}
          </p>
          <p className={`mt-3 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {user?.bio || t('defaultBio')}
          </p>
        </div>

        {/* Stats */}
        <div className={`flex items-center gap-8 mt-6 py-4 border-y ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{stats.posts}</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('posts')}</p>
          </div>
          <div className="text-center cursor-pointer hover:opacity-70 transition-opacity" onClick={() => setModalType('followers')}>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} ${isLoadingStats ? 'animate-pulse' : ''}`}>{stats.followers.toLocaleString()}</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('followers')}</p>
          </div>
          <div className="text-center cursor-pointer hover:opacity-70 transition-opacity" onClick={() => setModalType('following')}>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} ${isLoadingStats ? 'animate-pulse' : ''}`}>{stats.following.toLocaleString()}</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('following')}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex mt-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          {['posts', 'media', 'likes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors relative ${activeTab === tab ? 'text-indigo-600' :
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

        {/* Tab Content */}
        <div className="mt-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Followers/Following Modal */}
      <FollowersModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        type={modalType || 'followers'}
        onUserClick={(user) => {
          console.log('User clicked:', user);
        }}
      />
    </div>
  );
});

export default ProfileView;