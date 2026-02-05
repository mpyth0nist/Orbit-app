import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import SearchView from '../componants/views/SearchView';
import Sidebar from '../componants/layout/Sidebar';
import Header from '../componants/layout/Header';
import MobileNav from '../componants/layout/MobileNav';

export default function Search() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  // Note: SearchView component handles its own search queries

  // Fetch notifications count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.notifications.getUnreadCount(),
    enabled: !!user,
  });

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (post) => {
      // Use reactions toggle API
      return api.reactions.toggle('thread', post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  // Repost mutation
  const repostThreadMutation = useMutation({
    mutationFn: (post) => api.threads.repost(post.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });

  // Bookmark mutation
  const bookmarkThreadMutation = useMutation({
    mutationFn: (post) => api.threads.toggleSave(post.id),
    onSuccess: () => {
      // Invalidate search queries? Search queries depend on 'q'.
      // Usually we just invalidate all 'search' or 'threads' queries.
      // But queryKey might be dynamic in SearchView.
      // For now, let's just invalidate 'threads' to be safe, although SearchView manages its own data usually?
      // SearchView says "SearchView component handles its own search queries".
      // We might need to handle optimistic updates in SearchView or signal it to refetch.
      // For now, simpler approach:
      queryClient.invalidateQueries({ queryKey: ['search'] }); // Assuming SearchView uses this key prefix
    },
  });

  const handlePostClick = (post) => {
    window.location.href = `/thread/${post.id}`;
  };

  const unreadNotifications = unreadData?.count || 0;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'
      }`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
        <Sidebar
          activeTab="search"
          setActiveTab={() => { }}
          unreadNotifications={unreadNotifications}
          user={user}
        />
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Header */}


        {/* Page Content */}
        <main className="p-4 pb-24 lg:pb-8 max-w-4xl mx-auto">
          <SearchView
            currentUserEmail={user?.email}
            onPostClick={handlePostClick}
            onLike={(post) => likePostMutation.mutate(post)}
            onShare={(post) => repostThreadMutation.mutate(post)}
            onBookmark={(post) => bookmarkThreadMutation.mutate(post)}
          />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="search"
        setActiveTab={() => { }}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
