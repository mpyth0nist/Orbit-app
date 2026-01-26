import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import CreatePostView from '../componants/feed/CreatePostView';
import Sidebar from '../componants/layout/Sidebar';
import Header from '../componants/layout/Header';
import MobileNav from '../componants/layout/MobileNav';

export default function CreatePost() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData) => {
      // Only send what backend expects. Author info is derived from token.
      const payload = {
        content: postData.content,
        // If postData has media object with url/type/size, include it
        media: postData.media
      };

      return apiClient.posts.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      // Redirect to feed after successful post
      window.location.href = '/';
    },
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
          unreadNotifications={0}
          user={user}
        />
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Header */}
        <Header
          user={user}
          unreadNotifications={0}
          onMenuClick={() => { }}
          onSearchClick={() => window.location.href = '/search'}
          onNotificationsClick={() => window.location.href = '/notifications'}
        />

        {/* Page Content */}
        <main className="p-4 pb-24 lg:pb-8 max-w-4xl mx-auto">
          <CreatePostView
            user={user}
            onBack={() => window.location.href = '/'}
            onPost={handlePost}
          />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="create"
        setActiveTab={() => { }}
        unreadNotifications={0}
      />
    </div>
  );
}
