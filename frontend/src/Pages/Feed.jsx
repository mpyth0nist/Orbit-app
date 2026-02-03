import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const { ref, InView } = useInView();

  // State for active feed tab
  const [activeFeedTab, setActiveFeedTab] = React.useState('following');

  // Fetch posts with infinite scroll
  const {
    data,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['threads', activeFeedTab],
    queryFn: ({ pageParam }) => {
      // Choose API endpoint based on active tab
      if (activeFeedTab === 'trending') {
        return apiClient.threads.getTrending({ cursor: pageParam, limit: 10 });
      }
      return apiClient.threads.getFeed({ cursor: pageParam, limit: 10 });
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.pagination?.nextCursor,
  });

  // Load more when scrolling to bottom
  useEffect(() => {
    if (InView && hasNextPage) {
      fetchNextPage();
    }
  }, [InView, hasNextPage, fetchNextPage]);

  // Flatten pages into a single array of posts, filtering out any undefined/null items
  const posts = data?.pages.flatMap((page) => page).filter(Boolean) || [];

  // Fetch notifications count
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => apiClient.notifications.getUnreadCount(),
    enabled: !!user?.email,
  });

  const unreadNotifications = notificationsData?.count || 0;

  // Like post mutation with optimistic update
  const likePostMutation = useMutation({
    mutationFn: async (post) => {
      return apiClient.reactions.toggle('thread', post.id);
    },
    onMutate: async (postToLike) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['threads', activeFeedTab] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['threads', activeFeedTab]);

      // Optimistically update the cache
      queryClient.setQueryData(['threads', activeFeedTab], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            data: page.data.map(post =>
              post.id === postToLike.id
                ? {
                  ...post,
                  isLiked: !post.isLiked,
                  likesCount: post.isLiked
                    ? (post.likesCount || 1) - 1
                    : (post.likesCount || 0) + 1,
                }
                : post
            ),
          })),
        };
      });

      return { previousData };
    },
    onError: (err, postToLike, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['threads', activeFeedTab], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['threads', activeFeedTab] });
    },
  });

  const handlePostClick = (post) => navigate(`/thread/${post.id}`);

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
          {/* Feed Tabs */}
          <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveFeedTab('following')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeFeedTab === 'following'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              Following
              {activeFeedTab === 'following' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveFeedTab('trending')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeFeedTab === 'trending'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              Trending
              {activeFeedTab === 'trending' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
              )}
            </button>
          </div>

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
