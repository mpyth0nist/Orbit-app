import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import ProfileView from '../componants/views/ProfileView';
import EditProfileView from '../componants/views/EditProfileView';
import Sidebar from '../componants/layout/Sidebar';
import Header from '../componants/layout/Header';
import MobileNav from '../componants/layout/MobileNav';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const { isDarkMode } = useTheme();
  const { t, isDarkMode: themeDarkMode } = useLanguage();

  // Fetch user posts
  const { data: userPostsData, isLoading: postsLoading, error: postsError } = useQuery({
    queryKey: ['userPosts', user?.id],
    queryFn: async () => {
      const response = await api.users.getMyThreads();
      return response;
    },
    enabled: !!user?.id,
  });

  const userPosts = userPostsData || [];

  // Fetch notifications count
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.getUserNotifications(),
    enabled: !!user,
  });

  const handleUserUpdate = async (data) => {
    // Update user in context
    setUser({ ...user, ...data });
    try {
      await api.users.updateMe(data);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
    setIsEditingProfile(false);
  };

  const unreadNotifications = notifications?.length || 0;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'
      }`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
        <Sidebar
          activeTab="profile"
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
          {isEditingProfile ? (
            <EditProfileView
              user={user}
              onBack={() => setIsEditingProfile(false)}
              onSave={handleUserUpdate}
            />
          ) : (
            <ProfileView
              user={user}
              onEditProfile={() => setIsEditingProfile(true)}
              onSettingsClick={() => window.location.href = '/settings'}
              userPosts={userPosts}
              isLoading={postsLoading}
            />
          )}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="profile"
        setActiveTab={() => { }}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
