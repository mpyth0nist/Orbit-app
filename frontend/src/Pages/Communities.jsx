import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import CommunitiesView from '../componants/views/CommunitiesView';
import Sidebar from '../componants/layout/Sidebar';
import Header from '../componants/layout/Header';
import MobileNav from '../componants/layout/MobileNav';

export default function Communities() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

  // Fetch communities
  const { data: communities = [], isLoading: communitiesLoading } = useQuery({
    queryKey: ['communities'],
    queryFn: () => [], // TODO: Replace with api.communities.getAll() when endpoint is ready
  });

  // Fetch notifications count
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => api.notifications.getUserNotifications(user?.email),
    enabled: !!user?.email,
  });

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
          activeTab="communities"
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
          <CommunitiesView
            currentUserEmail={user?.email}
            communities={communities}
            isLoading={communitiesLoading}
          />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="communities"
        setActiveTab={() => {}}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
