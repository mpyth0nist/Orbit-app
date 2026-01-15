import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as base44 from '../api/base44Client';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FeedView from '../componants/feed/FeedView';
import Sidebar from '../componants/layout/Sidebar';
import Header from '../componants/layout/Header';
import MobileNav from '../componants/layout/MobileNav';

export default function Feed() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  // Fetch posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_date', 50),
  });

  // Fetch notifications count
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (post) => {
      const isLiked = post.liked_by?.includes(user?.email);
      const newLikedBy = isLiked
        ? post.liked_by.filter(email => email !== user?.email)
        : [...(post.liked_by || []), user?.email];
      
      return base44.entities.Post.update(post.id, {
        liked_by: newLikedBy,
        likes_count: isLiked ? (post.likes_count || 1) - 1 : (post.likes_count || 0) + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const handlePostClick = (post) => {
    // Navigate to thread detail
    window.location.href = `/thread/${post.id}`;
  };

  const unreadNotifications = notifications?.length || 0;

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'
    }`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${
        isDarkMode ? 'border-gray-700' : 'border-gray-100'
      }`}>
        <Sidebar
          activeTab="feed"
          setActiveTab={() => {}}
          unreadNotifications={unreadNotifications}
          user={user}
        />
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Header */}
        <Header
          user={user}
          unreadNotifications={unreadNotifications}
          onMenuClick={() => {}}
          onSearchClick={() => window.location.href = '/search'}
          onNotificationsClick={() => window.location.href = '/notifications'}
        />

        {/* Page Content */}
        <main className="p-4 pb-24 lg:pb-8 max-w-4xl mx-auto">
          <FeedView
            posts={posts}
            isLoading={postsLoading}
            currentUserEmail={user?.email}
            onPostClick={handlePostClick}
            onLike={(post) => likePostMutation.mutate(post)}
            onComment={handlePostClick}
          />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="feed"
        setActiveTab={() => {}}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
