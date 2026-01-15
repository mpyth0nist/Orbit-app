import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import NotificationsView from '../componants/views/NotificationsView';
import Sidebar from '../componants/layout/Sidebar';
import Header from '../componants/layout/Header';
import MobileNav from '../componants/layout/MobileNav';

export default function Notifications() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

  // Fetch notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => api.notifications.getUserNotifications(user?.email),
    enabled: !!user?.email,
  });

  const unreadNotifications = notifications?.filter(n => !n.is_read)?.length || 0;

  return (
    <div className={`min-h-screen ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'
    }`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${
        isDarkMode ? 'border-gray-700' : 'border-gray-100'
      }`}>
        <Sidebar
          activeTab="notifications"
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
          onNotificationsClick={() => {}}
        />

        {/* Page Content */}
        <main className="p-4 pb-24 lg:pb-8 max-w-4xl mx-auto">
          <NotificationsView
            currentUserEmail={user?.email}
            notifications={notifications}
            isLoading={notificationsLoading}
          />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="notifications"
        setActiveTab={() => {}}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
