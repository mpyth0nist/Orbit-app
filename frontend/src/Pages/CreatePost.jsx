import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import CreatePostView from '../componants/feed/CreatePostView';
import Sidebar from '../componants/layout/Sidebar';
import { useNavigate } from 'react-router-dom';
import MobileNav from '../componants/layout/MobileNav';

export default function CreatePost() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quoteId = searchParams.get('quoteId');

  // Fetch quoted post if it exists
  const { data: quotedPost } = useQuery({
    queryKey: ['thread', quoteId],
    queryFn: () => apiClient.threads.getById(quoteId),
    enabled: !!quoteId,
  });

  // Fetch notifications count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => apiClient.notifications.getUnreadCount(),
    enabled: !!user,
  });

  const unreadNotifications = unreadData?.count || 0;

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      // CreatePostView provides the full data (including FormData with media/content/repostId)
      return apiClient.threads.create(postData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      // Navigate to feed after successful post
      toast.success('Post created successfully');
      navigate('/');
    },
    onError: (error) => {
      console.error('Create post error:', error);
      toast.error(error.response?.data?.message || 'Failed to create post');
    }
  });

  const handlePost = async (postData) => {
    await createPostMutation.mutateAsync(postData);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'
      }`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
        <Sidebar
          activeTab="create"
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
          <CreatePostView
            user={user}
            onBack={() => navigate('/')}
            onPost={handlePost}
            isLoading={createPostMutation.isPending}
            error={createPostMutation.error?.response?.data?.message || createPostMutation.error?.message}
            quotedPost={quotedPost?.data || quotedPost}
          />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="create"
        setActiveTab={() => { }}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
