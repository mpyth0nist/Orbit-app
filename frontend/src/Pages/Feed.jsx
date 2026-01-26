import React, { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import apiClient from '../api/apiClient';
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
  const { ref, InView } = useInView();

  // Fetch posts with infinite scroll
  const {
    data,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['threads'],
    queryFn: ({ pageParam }) => apiClient.threads.getFeed({ cursor: pageParam, limit: 10 }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor,
  });

  // Load more when scrolling to bottom
  useEffect(() => {
    if (InView && hasNextPage) {
      fetchNextPage();
    }
  }, [InView, hasNextPage, fetchNextPage]);

  // Flatten pages into a single array of posts
  const posts = data?.pages.flatMap((page) => page.data) || [];

  // Fetch notifications count
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => apiClient.notifications.getUnreadCount(),
    enabled: !!user?.email,
  });

  const unreadNotifications = notificationsData?.count || 0; // Adjust based on backend response

  // Like post mutation
  const likePostMutation = useMutation({
    mutationFn: async (post) => {
      // Optimistic update logic handles UI immediately, this is just the API call
      return apiClient.reactions.toggle('thread', post.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads'] });
    },
  });

  const handlePostClick = (post) => {
    // Navigate to thread detail
    window.location.href = `/thread/${post.id}`;
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <Sidebar
          activeTab="feed"
          setActiveTab={() => { }}
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
          onMenuClick={() => { }}
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

          {/* Infinite scroll loader */}
          {(isFetchingNextPage || hasNextPage) && (
            <div ref={ref} className="flex justify-center py-4">
              {isFetchingNextPage ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              ) : (
                <span className="text-gray-400 text-sm">Load more</span>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="feed"
        setActiveTab={() => { }}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
