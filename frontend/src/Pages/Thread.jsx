import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThreadDetailView from '../componants/feed/ThreadDetailView';
import Sidebar from '../componants/layout/Sidebar';
import Header from '../componants/layout/Header';
import MobileNav from '../componants/layout/MobileNav';
import QUERY_KEYS from '../constants/queryKeys';

export default function Thread() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  // Fetch specific post
  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: QUERY_KEYS.thread(id),
    queryFn: () => apiClient.threads.getById(id),
    enabled: !!id,
    retry: false,
  });

  // Fetch notifications count
  const { data: notificationsData } = useQuery({
    queryKey: QUERY_KEYS.notificationsUnreadCount,
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
      await queryClient.cancelQueries({ queryKey: ['thread', id] });

      // Snapshot the previous value
      const previousPost = queryClient.getQueryData(['thread', id]);

      // Optimistically update the cache
      queryClient.setQueryData(['thread', id], (old) => {
        if (!old) return old;
        const isCurrentlyLiked = old.isLiked;
        return {
          ...old,
          isLiked: !isCurrentlyLiked,
          likesCount: isCurrentlyLiked
            ? (old.likesCount || 1) - 1
            : (old.likesCount || 0) + 1,
        };
      });

      return { previousPost };
    },
    onError: (err, postToLike, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(['thread', id], context.previousPost);
      }
      toast.error('Failed to like post');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', id] });
    },
  });

  // Repost mutation
  const repostMutation = useMutation({
    mutationFn: (post) => apiClient.threads.repost(post.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', id] });
      toast.success('Post reposted!');
      // navigate('/'); // Optional: redirect to home to see the new repost
    },
    onError: (error) => {
      toast.error('Failed to repost');
    }
  });

  // Check if thread belongs to a community and fetch membership
  const communityId = post?.communityId;
  const { data: membershipData } = useQuery({
    queryKey: QUERY_KEYS.communityMembership(communityId, user?.id),
    queryFn: () => apiClient.communities.getMembership(communityId),
    enabled: !!communityId && !!user?.id,
  });

  const isMember = membershipData?.isMember || false;

  // Join community mutation
  const joinMutation = useMutation({
    mutationFn: () => apiClient.communities.join(communityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.communityMembership(communityId, user?.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.community(communityId) });
      toast.success('Successfully joined community');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to join community';
      toast.error(message);
    }
  });

  const handleLike = (post) => {
    likePostMutation.mutate(post);
  };

  if (postLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'}`}>
        <div className="text-center">
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Post not found</h2>
          <button
            onClick={() => navigate('/')}
            className="text-indigo-600 hover:text-indigo-500"
          >
            Go back to feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
        <Sidebar
          activeTab="thread"
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
          <ThreadDetailView
            post={post}
            user={user}
            currentUserEmail={user?.email}
            onBack={() => navigate(-1)}
            onLike={handleLike}
            onShare={(post) => repostMutation.mutate(post)}
            communityId={communityId}
            isCommunityMember={communityId ? isMember : true}
            onJoinCommunity={communityId && !isMember ? () => joinMutation.mutate() : null}
          />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="thread"
        setActiveTab={() => { }}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
