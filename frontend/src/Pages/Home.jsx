import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

import Sidebar from '../componants/layout/Sidebar';
import Header from '../componants/layout/Header';
import MobileNav from '../componants/layout/MobileNav';
import FeedView from '../componants/feed/FeedView';
import CreatePostView from '../componants/feed/CreatePostView';
import ThreadDetailView from '../componants/feed/ThreadDetailView';
import ProfileView from '../componants/views/ProfileView';
import EditProfileView from '../componants/views/EditProfileView';
import SearchView from '../componants/views/SearchView';
import NotificationsView from '../componants/views/NotificationsView';
import CommunitiesView from '../componants/views/CommunitiesView';
import SettingsView from '../componants/views/SettingsView';
import { XMarkIcon } from '../componants/ui/Icons';

export default function Home() {
  const navigate = useNavigate();
  const { user, setUser, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const queryClient = useQueryClient();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4">
            <span className="text-white font-bold text-2xl">O</span>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Fetch posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => api.posts.getAll(50),
  });

  // Fetch notifications count
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.getUserNotifications(),
    enabled: !!user,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      // Backend expects: { content: string, mediaUrls?: string[] }
      return api.posts.create({
        content: postData.content,
        mediaUrls: postData.mediaUrls || [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (post) => {
      // Use reactions toggle API (thread type, post ID)
      return api.reactions.toggle('thread', post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setActiveTab('thread');
  };

  const handleUserUpdate = async (data) => {
    setUser({ ...user, ...data });
  };

  const unreadNotifications = notifications?.length || 0;

  const renderContent = () => {
    if (isEditingProfile) {
      return (
        <EditProfileView
          user={user}
          onBack={() => setIsEditingProfile(false)}
          onSave={handleUserUpdate}
        />
      );
    }

    switch (activeTab) {
      case 'feed':
        return (
          <FeedView
            posts={posts}
            isLoading={postsLoading}
            currentUserEmail={user?.email}
            onPostClick={handlePostClick}
            onLike={(post) => likePostMutation.mutate(post)}
            onComment={handlePostClick}
          />
        );
      case 'create':
        return (
          <CreatePostView
            user={user}
            onBack={() => setActiveTab('feed')}
            onPost={(postData) => createPostMutation.mutateAsync(postData)}
          />
        );
      case 'thread':
        return (
          <ThreadDetailView
            post={selectedPost}
            user={user}
            currentUserEmail={user?.email}
            onBack={() => {
              setSelectedPost(null);
              setActiveTab('feed');
            }}
            onLike={(post) => {
              likePostMutation.mutate(post);
              // Update local selected post
              const isLiked = post.liked_by?.includes(user?.email);
              setSelectedPost({
                ...post,
                liked_by: isLiked
                  ? post.liked_by.filter(e => e !== user?.email)
                  : [...(post.liked_by || []), user?.email],
                likes_count: isLiked ? (post.likes_count || 1) - 1 : (post.likes_count || 0) + 1,
              });
            }}
          />
        );
      case 'search':
        return (
          <SearchView
            currentUserEmail={user?.email}
            onPostClick={handlePostClick}
            onLike={(post) => likePostMutation.mutate(post)}
          />
        );
      case 'notifications':
        return <NotificationsView currentUserEmail={user?.email} />;
      case 'communities':
        return <CommunitiesView currentUserEmail={user?.email} />;
      case 'profile':
        return (
          <ProfileView
            user={user}
            onEditProfile={() => setIsEditingProfile(true)}
            onSettingsClick={() => setActiveTab('settings')}
          />
        );
      case 'settings':
        return (
          <SettingsView
            user={user}
            onEditProfile={() => setIsEditingProfile(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r border-gray-100">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadNotifications={unreadNotifications}
          user={user}
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-2xl">
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 rounded-xl"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              unreadNotifications={unreadNotifications}
              onClose={() => setIsMobileSidebarOpen(false)}
              user={user}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Header */}
        <Header
          user={user}
          unreadNotifications={unreadNotifications}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          onSearchClick={() => setActiveTab('search')}
          onNotificationsClick={() => setActiveTab('notifications')}
        />

        {/* Page Content */}
        <main className="p-4 pb-24 lg:pb-8 max-w-4xl mx-auto">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}