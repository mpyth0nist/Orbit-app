import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import SettingsView from '../componants/views/SettingsView';
import EditProfileView from '../componants/views/EditProfileView';
import SecurityView from '../componants/views/SecurityView';
import HelpCenterView from '../componants/views/HelpCenterView';
import FeedbackView from '../componants/views/FeedbackView';
import Sidebar from '../componants/layout/Sidebar';
import Header from '../componants/layout/Header';
import MobileNav from '../componants/layout/MobileNav';

export default function Settings() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [isHelpCenter, setIsHelpCenter] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const { isDarkMode } = useTheme();

  // Fetch notifications count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => apiClient.notifications.getUnreadCount(),
    enabled: !!user?.email,
  });

  const handleUserUpdate = async (data) => {
    // Update user in context - backend update is handled by EditProfileView
    setUser({ ...user, ...data });
    setIsEditingProfile(false);
  };

  const unreadNotifications = unreadData?.count || 0;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'
      }`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
        }`}>
        <Sidebar
          activeTab="settings"
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
          {isEditingProfile ? (
            <EditProfileView
              user={user}
              onBack={() => setIsEditingProfile(false)}
              onSave={handleUserUpdate}
            />
          ) : isEditingSecurity ? (
            <SecurityView
              onBack={() => setIsEditingSecurity(false)}
            />
          ) : isHelpCenter ? (
            <HelpCenterView
              onBack={() => setIsHelpCenter(false)}
            />
          ) : isSendingFeedback ? (
            <FeedbackView
              onBack={() => setIsSendingFeedback(false)}
            />
          ) : (
            <SettingsView
              user={user}
              onEditProfile={() => {
                setIsEditingSecurity(false);
                setIsHelpCenter(false);
                setIsSendingFeedback(false);
                setIsEditingProfile(true);
              }}
              onEditSecurity={() => {
                setIsEditingProfile(false);
                setIsHelpCenter(false);
                setIsSendingFeedback(false);
                setIsEditingSecurity(true);
              }}
              onHelpCenter={() => {
                setIsEditingProfile(false);
                setIsEditingSecurity(false);
                setIsSendingFeedback(false);
                setIsHelpCenter(true);
              }}
              onFeedback={() => {
                setIsEditingProfile(false);
                setIsEditingSecurity(false);
                setIsHelpCenter(false);
                setIsSendingFeedback(true);
              }}
            />
          )}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        activeTab="settings"
        setActiveTab={() => { }}
        unreadNotifications={unreadNotifications}
      />
    </div>
  );
}
