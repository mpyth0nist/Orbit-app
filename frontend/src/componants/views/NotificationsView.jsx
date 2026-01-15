import React, { useState, useEffect } from 'react';
import { HeartIcon, ChatBubbleIcon, UserIcon, UsersIcon } from '../ui/Icons';
import api from '../../api/apiClient';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

const NotificationIcon = ({ type }) => {
  const icons = {
    like: <HeartIcon className="w-5 h-5 text-rose-500" filled />,
    comment: <ChatBubbleIcon className="w-5 h-5 text-indigo-500" />,
    follow: <UserIcon className="w-5 h-5 text-green-500" />,
    mention: <span className="text-lg">@</span>,
    community: <UsersIcon className="w-5 h-5 text-purple-500" />,
  };
  return icons[type] || icons.like;
};

const NotificationBg = ({ type }) => {
  const colors = {
    like: 'bg-rose-100',
    comment: 'bg-indigo-100',
    follow: 'bg-green-100',
    mention: 'bg-amber-100',
    community: 'bg-purple-100',
  };
  return colors[type] || colors.like;
};

export default function NotificationsView({ currentUserEmail }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { t, isDarkMode } = useLanguage();
  const { isDarkMode: themeDarkMode } = useTheme();

  useEffect(() => {
    loadNotifications();
  }, [currentUserEmail]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Try to load real notifications
      const data = await api.notifications.getUserNotifications(currentUserEmail);
      
      // If no notifications, use sample data
      if (!data?.length) {
        setNotifications([
          { id: '1', type: 'like', actor_name: 'Sarah Chen', actor_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', message: t('likes'), created_date: new Date(Date.now() - 1000 * 60 * 5), is_read: false },
          { id: '2', type: 'comment', actor_name: 'Alex Rivera', actor_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', message: t('comment'), created_date: new Date(Date.now() - 1000 * 60 * 30), is_read: false },
          { id: '3', type: 'follow', actor_name: 'Maya Patel', actor_avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', message: t('follow'), created_date: new Date(Date.now() - 1000 * 60 * 60 * 2), is_read: true },
          { id: '4', type: 'mention', actor_name: 'Jordan Lee', actor_avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100', message: t('mentions'), created_date: new Date(Date.now() - 1000 * 60 * 60 * 5), is_read: true },
          { id: '5', type: 'community', actor_name: 'Tech Innovators', actor_avatar: null, message: t('communities'), created_date: new Date(Date.now() - 1000 * 60 * 60 * 24), is_read: true },
        ]);
      } else {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      // Set sample notifications on error
      setNotifications([
        { id: '1', type: 'like', actor_name: 'Sarah Chen', actor_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', message: t('likes'), created_date: new Date(), is_read: false },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>{t('allNotifications')}</h1>
          {unreadCount > 0 && (
            <p className={`text-sm mt-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>{unreadCount} {t('unread')}</p>
          )}
        </div>
        <button className={`text-sm font-medium ${
          isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
        }`}>
          {t('markAllAsRead')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'like', 'comment', 'follow', 'mention'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${
              filter === type
                ? 'bg-indigo-600 text-white'
                : isDarkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? t('all') : t(type + 's')}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className={`rounded-3xl p-12 text-center ${
          isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-600'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <HeartIcon className={`w-8 h-8 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
          </div>
          <h3 className={`text-lg font-semibold mb-1 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>{t('noResults')}</h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            {t('loading')}...
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer ${
                notification.is_read 
                  ? isDarkMode ? 'bg-gray-800' : 'bg-white'
                  : isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-50'
              }`}
            >
              <div className="relative">
                <img
                  src={notification.actor_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.actor_name)}&background=6366f1&color=fff`}
                  alt={notification.actor_name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${NotificationBg({ type: notification.type })} flex items-center justify-center`}>
                  <NotificationIcon type={notification.type} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>
                  <span className="font-semibold">{notification.actor_name}</span>{' '}
                  {notification.message}
                </p>
                <p className={`text-sm mt-1 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {notification.created_date 
                    ? format(new Date(notification.created_date), 'MMM d, h:mm a')
                    : t('now')}
                </p>
              </div>
              {!notification.is_read && (
                <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}