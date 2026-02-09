import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CogIcon, CheckBadgeIcon, CameraIcon, ImageIcon, HeartIcon, LockClosedIcon } from '../ui/Icons';
import TierBadge from '../ui/TierBadge';
import PostCard from '../feed/PostCard';
import FollowersModal from '../ui/FollowersModal';
import api, { usersAPI, getMediaUrl } from '../../api/apiClient';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useInView } from 'react-intersection-observer';

const ProfileView = forwardRef(function ProfileView({
  user,
  onEditProfile,
  onSettingsClick,
  onPostClick,  // Callback for post click navigation
  userPosts = [],
  isLoading = true,
  isVisible = true,  // Whether this view is currently visible/active
  onLoadMore,
  hasMore,
  loadingMore
}, ref) {
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState({ followers: 0, following: 0, threads: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [modalType, setModalType] = useState(null); // 'followers' or 'following'

  // Tab content state
  const [likedPosts, setLikedPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [tabError, setTabError] = useState(null);

  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const { user: currentUser, setUser: setAuthUser } = useAuth();
  const isOwnProfile = currentUser?.id === user?.id;
  const bannerInputRef = React.useRef(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setIsUploadingBanner(true);
    try {
      const response = await api.media.uploadProfileBanner(file);
      const newCoverUrl = response?.coverUrl;

      if (newCoverUrl) {
        setAuthUser(prev => ({ ...prev, coverUrl: newCoverUrl }));
        toast.success('Cover photo updated');
      }
    } catch (error) {
      console.error('Failed to upload banner:', error);
      toast.error('Failed to update cover photo');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // State for optimistic updates on userPosts (received as prop, but we track changes locally)
  const [localUserPosts, setLocalUserPosts] = useState(userPosts);

  const { ref: loadMoreRef, inView } = useInView();

  useEffect(() => {
    if (inView && hasMore && !loadingMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, loadingMore, isLoading, onLoadMore]);



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
      toast.error('Failed to like post');
    },
  });

  // Repost mutation
  const repostMutation = useMutation({
    mutationFn: (post) => api.threads.repost(post.id),
    onSuccess: () => {
      // Refresh posts and stats
      loadUserStats();
      queryClient.invalidateQueries({ queryKey: ['userPosts', user?.id] });
      toast.success('Post reposted!');
    },
    onError: () => {
      toast.error('Failed to repost');
    }
  });

  const handleRepost = (post) => {
    repostMutation.mutate(post);
  };

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: (post) => api.threads.toggleSave(post.id),
    onMutate: (postToBookmark) => {
      // Optimistically update local state
      const updatePosts = (posts) => posts.map(p =>
        p.id === postToBookmark.id
          ? { ...p, isSaved: !p.isSaved }
          : p
      );

      setLocalUserPosts(prev => updatePosts(prev));
      setLikedPosts(prev => updatePosts(prev));
    },
    onError: (err, postToBookmark) => {
      // Rollback
      const updatePosts = (posts) => posts.map(p =>
        p.id === postToBookmark.id
          ? { ...p, isSaved: !p.isSaved }
          : p
      );
      setLocalUserPosts(prev => updatePosts(prev));
      setLikedPosts(prev => updatePosts(prev));
      toast.error('Failed to update bookmark');
    },
    onSuccess: (data, variables) => {
      toast.success('Bookmark updated');
    }
  });

  const handleBookmark = (post) => {
    bookmarkMutation.mutate(post);
  };

  const handleLike = (post) => {
    // Prevent liking own post

    if (currentUser?.id === post.user_id || currentUser?.id === post.userId) {
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
      } else if (tab === 'saved') {
        const response = await api.threads.getSaved({ page: 1, limit: 50 });
        const data = response?.data || response || [];
        setSavedPosts(Array.isArray(data) ? data : []);
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

    // Check for private account
    if (!isOwnProfile && user?.isPrivate && !user?.isFollowing) {
      return (
        <div className={`text-center py-12 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <LockClosedIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {t('privateAccount')}
          </h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            {t('privateAccountMessage')}
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case 'posts':
        if (isLoading) {
          return (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
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
            {localUserPosts.map((post) => {

              return (
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
                  onShare={handleRepost}
                  onBookmark={handleBookmark}
                  isLiked={post.isLiked}
                  isBookmarked={post.isSaved}
                  isOwnPost={currentUser?.id === post.user.id || currentUser?.id === post.userId}
                />)
            })}

            {/* Load More Indicator */}
            {(hasMore || loadingMore) && (
              <div ref={loadMoreRef} className="flex flex-col items-center justify-center py-4 gap-2">
                {loadingMore ? (
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                ) : (
                  <button
                    onClick={onLoadMore}
                    className={`text-sm font-medium hover:underline ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}
                  >
                    Load more posts
                  </button>
                )}
              </div>
            )}
          </div>);

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
                onShare={handleRepost}
                onBookmark={handleBookmark}
                isLiked={true}
                isBookmarked={post.isSaved}
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

      case 'saved':
        if (savedPosts.length === 0) {
          return (
            <div className={`text-center py-12 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <CheckBadgeIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {t('noSaved') || 'No saved posts'}
              </h3>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                {t('noSavedMessage') || 'Posts you save will appear here'}
              </p>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            {savedPosts.map((post) => (
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
                onShare={handleRepost}
                onBookmark={handleBookmark}
                isLiked={post.isLiked}
                isBookmarked={true}
                isOwnPost={currentUser?.id === post.user?.id || currentUser?.id === post.userId}
              />
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
      {/* Cover Image */}
      <div className="relative h-32 md:h-48 bg-gradient-to-br from-blue-500 via-blue-400 to-blue-300 rounded-3xl overflow-hidden group">
        {user?.coverUrl ? (
          <img src={getMediaUrl(user.coverUrl)} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-400 to-blue-300" />
        )}
        <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:opacity-100" />

        {isOwnProfile && (
          <>
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
              disabled={isUploadingBanner}
            >
              {isUploadingBanner ? <Loader2 className="w-5 h-5 animate-spin" /> : <CameraIcon className="w-5 h-5" />}
            </button>
            <input
              type="file"
              ref={bannerInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleBannerUpload}
            />
          </>
        )}
      </div>

      {/* Profile Info */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="absolute -top-12 md:-top-16 left-6">
          <div className="relative">
            <img
              src={getMediaUrl(user?.photoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User')}&background=6366f1&color=fff&size=128`}
              alt={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
              className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-xl"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onEditProfile}
            className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
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
            <TierBadge points={user?.points || 0} />
          </div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            @{user?.username || user?.email?.split('@')[0]}
          </p>
          <p className={`mt-3 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {user?.bio || t('defaultBio')}
          </p>
        </div>

        {/* Stats */}
        <div className={`flex items-center gap-4 md:gap-8 mt-6 py-4 border-y ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="text-center">
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{stats.posts}</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('posts')}</p>
          </div>
          <div
            className={`text-center transition-opacity ${(!isOwnProfile && user?.isPrivate && !user?.isFollowing) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-70'}`}
            onClick={() => {
              if (isOwnProfile || !user?.isPrivate || user?.isFollowing) {
                setModalType('followers');
              }
            }}
          >
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} ${isLoadingStats ? 'animate-pulse' : ''}`}>{stats.followers.toLocaleString()}</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('followers')}</p>
          </div>
          <div
            className={`text-center transition-opacity ${(!isOwnProfile && user?.isPrivate && !user?.isFollowing) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-70'}`}
            onClick={() => {
              if (isOwnProfile || !user?.isPrivate || user?.isFollowing) {
                setModalType('following');
              }
            }}
          >
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} ${isLoadingStats ? 'animate-pulse' : ''}`}>{stats.following.toLocaleString()}</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('following')}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex mt-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          {['posts', 'media', 'likes', ...(isOwnProfile ? ['saved'] : [])].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors relative ${activeTab === tab ? 'text-blue-400' :
                isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {t(tab)}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-400 rounded-full" />
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
        targetUserId={currentUser?.id}
        type={modalType || 'followers'}
        onUserClick={(u) => navigate(`/profile/${u.id}`)}
      />
    </div>
  );
});

export default ProfileView;