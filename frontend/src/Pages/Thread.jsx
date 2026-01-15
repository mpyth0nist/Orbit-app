import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as base44 from '../api/base44Client';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThreadDetailView from '../componants/feed/ThreadDetailView';
import Sidebar from '../componants/layout/Sidebar';
import Header from '../componants/layout/Header';
import MobileNav from '../componants/layout/MobileNav';

export default function Thread() {
  const { id } = useParams();
  const { user } = useAuth();
  const [selectedPost, setSelectedPost] = useState(null);
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  // Fetch specific post
  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => base44.entities.Post.get(id),
    enabled: !!id,
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
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
  });

  useEffect(() => {
    if (post) {
      setSelectedPost(post);
    }
  }, [post]);

  const handleLike = (post) => {
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
  };

  const unreadNotifications = notifications?.length || 0;

  if (postLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!selectedPost) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h2>
          <button
            onClick={() => window.location.href = '/'}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Go back to feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'
    }`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${
        isDarkMode ? 'border-gray-700' : 'border-gray-100'
      }`}>
        <Sidebar
          activeTab="thread"
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
          <ThreadDetailView
            post={selectedPost}
            user={user}
            currentUserEmail={user?.email}
            onBack={() => window.location.href = '/'}
            onLike={handleLike}
          />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="thread"
        setActiveTab={() => {}}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
