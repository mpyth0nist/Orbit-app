import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import CommunitiesView from '../componants/views/CommunitiesView';
import Sidebar from '../componants/layout/Sidebar';
import MobileNav from '../componants/layout/MobileNav';

export default function Communities() {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

  // Fetch notifications count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.notifications.getUnreadCount(),
    enabled: !!user,
  });

  const unreadNotifications = unreadData?.count || 0;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'}`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
        <Sidebar
          activeTab="communities"
          setActiveTab={() => { }}
          unreadNotifications={unreadNotifications}
          user={user}
        />
      </aside>

      {/* Main Content */}
      <div className="lg:pl-72">
        {/* Page Content */}
        <main className="p-4 pb-24 lg:pb-8 max-w-4xl mx-auto">
          <CommunitiesView currentUserId={user?.id} />
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="communities"
        setActiveTab={() => { }}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
