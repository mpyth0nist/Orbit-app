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
import QuickCreatePost from '../componants/feed/QuickCreatePost';
import { XMarkIcon } from '../componants/ui/Icons';


export default function Feed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();

  // State for active feed tab
  const [activeFeedTab, setActiveFeedTab] = React.useState('following');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = React.useState(false);

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
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // Flatten pages into a single array of posts, filtering out any undefined/null items
  const posts = data?.pages.flatMap((page) => Array.isArray(page) ? page : []).filter(Boolean) || [];

  // Fetch notifications count
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => apiClient.notifications.getUnreadCount(),
    enabled: !!user,
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
          pages: old.pages.map(page =>
            page.map(post =>
              post.id === postToLike.id
                ? {
                  ...post,
                  isLiked: !post.isLiked,
                  likesCount: post.isLiked
                    ? (post.likesCount || 1) - 1
                    : (post.likesCount || 0) + 1,
                }
                : post
            )
          ),
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

  // Repost thread mutation
  const repostThreadMutation = useMutation({
    mutationFn: async (post) => {
      // For now, instant repost (no quote content)
      return apiClient.threads.repost(post.id);
    },
    onSuccess: () => {
      // Refetch threads to show the new repost
      queryClient.invalidateQueries({ queryKey: ['threads', activeFeedTab] });
      // Optional: show success toast
    },
    onError: (err) => {
      console.error('Repost failed:', err);
      // Optional: show error toast
    }
  });

  // Bookmark thread mutation with optimistic update
  const bookmarkThreadMutation = useMutation({
    mutationFn: async (post) => {
      return apiClient.threads.toggleSave(post.id);
    },
    onMutate: async (postToBookmark) => {
      await queryClient.cancelQueries({ queryKey: ['threads', activeFeedTab] });
      const previousData = queryClient.getQueryData(['threads', activeFeedTab]);

      queryClient.setQueryData(['threads', activeFeedTab], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page =>
            page.map(post =>
              post.id === postToBookmark.id
                ? { ...post, isSaved: !post.isSaved }
                : post
            )
          ),
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
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

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className={`fixed inset-y-0 left-0 w-80 shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className={`absolute top-4 right-4 p-2 rounded-xl ${isDarkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <Sidebar
              activeTab="feed"
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
          onMenuClick={() => setIsMobileSidebarOpen(true)}
          unreadNotifications={unreadNotifications}
          user={user}
        />


        {/* Page Content */}
        <main className="p-4 pb-24 lg:pb-8 max-w-2xl mx-auto">
          <QuickCreatePost />


          {/* Feed Tabs */}

          <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveFeedTab('following')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeFeedTab === 'following'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              Following
              {activeFeedTab === 'following' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
              )}
            </button>
            <button
              onClick={() => setActiveFeedTab('trending')}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${activeFeedTab === 'trending'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
            >
              Trending
              {activeFeedTab === 'trending' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
              )}
            </button>
          </div>

          <FeedView
            posts={posts}
            isLoading={postsLoading}
            currentUserEmail={user?.email}
            currentUserId={user?.id}
            onPostClick={handlePostClick}
            onLike={(post) => likePostMutation.mutate(post)}
            onComment={handlePostClick}
            onShare={(post) => repostThreadMutation.mutate(post)}
            onBookmark={(post) => bookmarkThreadMutation.mutate(post)}
            currentTab={activeFeedTab}
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
