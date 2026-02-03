import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HeartIcon, ChatBubbleIcon, UserIcon } from '../ui/Icons';
import api, { getMediaUrl } from '../../api/apiClient';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Trash2, Check, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

// Map notification types to icons
const NotificationIcon = ({ type }) => {
  const icons = {
    LIKE: <HeartIcon className="w-4 h-4 text-rose-500" filled />,
    COMMENT: <ChatBubbleIcon className="w-4 h-4 text-indigo-500" />,
    NEW_FOLLOW: <UserIcon className="w-4 h-4 text-green-500" />,
    FOLLOW_REQUEST: <UserIcon className="w-4 h-4 text-amber-500" />,
    ACCEPTED_FOLLOW: <Check className="w-4 h-4 text-green-500" />,
  };
  return icons[type] || <HeartIcon className="w-4 h-4 text-gray-500" />;
};

// Map notification types to background colors
const getNotificationBg = (type, isDarkMode) => {
  const colors = {
    LIKE: isDarkMode ? 'bg-rose-900/30' : 'bg-rose-100',
    COMMENT: isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-100',
    NEW_FOLLOW: isDarkMode ? 'bg-green-900/30' : 'bg-green-100',
    FOLLOW_REQUEST: isDarkMode ? 'bg-amber-900/30' : 'bg-amber-100',
    ACCEPTED_FOLLOW: isDarkMode ? 'bg-green-900/30' : 'bg-green-100',
  };
  return colors[type] || (isDarkMode ? 'bg-gray-700' : 'bg-gray-100');
};

// Get notification message based on type
const getNotificationMessage = (type, t) => {
  const messages = {
    LIKE: t('likedYourPost') || 'liked your post',
    COMMENT: t('commentedOnYourPost') || 'commented on your post',
    NEW_FOLLOW: t('startedFollowingYou') || 'started following you',
    FOLLOW_REQUEST: t('requestedToFollowYou') || 'requested to follow you',
    ACCEPTED_FOLLOW: t('acceptedYourFollowRequest') || 'accepted your follow request',
  };
  return messages[type] || 'interacted with you';
};

// Map filter to notification type
const getFilterType = (filter) => {
  const filterMap = {
    'like': 'LIKE',
    'comment': 'COMMENT',
    'follow': 'NEW_FOLLOW',
  };
  return filterMap[filter] || null;
};

export default function NotificationsView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  // Fetch notifications
  const { data: notificationsData, isLoading, error } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => api.notifications.get({ filter: filter === 'all' ? undefined : filter, limit: 50 }),
  });

  // Get unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.notifications.getUnreadCount(),
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: ({ id, isRead }) => api.notifications.update(id, { isRead }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.notifications.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => api.notifications.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Handle follow request
  const handleFollowRequestMutation = useMutation({
    mutationFn: ({ userId, isAccepted, notificationId }) =>
      api.users.updateFollowRequest(userId, isAccepted).then(() => notificationId),
    onSuccess: (notificationId) => {
      // Mark notification as read and/or delete/update it
      markAsReadMutation.mutate({ id: notificationId, isRead: true });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Also invalidate followers/following if accepted
      queryClient.invalidateQueries({ queryKey: ['user-followers'] });
    },
  });

  // Track request action status locally
  const [requestStatus, setRequestStatus] = useState({});

  const handleFollowRequest = (notification, isAccepted) => {
    if (notification.actor?.id) {
      // Set local state immediately
      setRequestStatus(prev => ({
        ...prev,
        [notification.id]: isAccepted ? 'ACCEPTED' : 'REFUSED'
      }));

      handleFollowRequestMutation.mutate({
        userId: notification.actor.id,
        isAccepted,
        notificationId: notification.id
      });
    }
  };

  // Extract notifications from response
  const notifications = useMemo(() => {
    if (!notificationsData) return [];
    // Handle both array and object response formats
    if (Array.isArray(notificationsData)) return notificationsData;
    if (notificationsData.data) return notificationsData.data;
    if (notificationsData.notifications) return notificationsData.notifications;
    return [];
  }, [notificationsData]);

  // Filter notifications client-side if filter is specific type
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    const filterType = getFilterType(filter);
    if (!filterType) return notifications;
    return notifications.filter(n => n.type === filterType);
  }, [notifications, filter]);

  const unreadCount = unreadData?.count || 0;

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Prevent clicking if it's a pending follow request (interactions are handled by buttons)
    if (notification.type === 'FOLLOW_REQUEST') return;

    // Mark as read if unread
    if (!notification.isRead) {
      markAsReadMutation.mutate({ id: notification.id, isRead: true });
    }

    // Navigate based on entity type
    if (notification.entity) {
      if (notification.entity.type === 'THREAD') {
        navigate(`/thread/${notification.entity.id}`);
      } else if (notification.entity.type === 'COMMENT') {
        // Navigate to thread containing the comment
        navigate(`/thread/${notification.entity.id}`);
      } else if (notification.entity.type === 'USER') {
        navigate(`/user/${notification.entity.id}`);
      }
    } else if (notification.actor?.id) {
      // For follow notifications, navigate to actor's profile
      navigate(`/user/${notification.actor.id}`);
    }
  };

  // Get actor display name
  const getActorName = (actor) => {
    if (!actor) return 'Someone';
    if (actor.profile?.firstName || actor.profile?.lastName) {
      return `${actor.profile.firstName || ''} ${actor.profile.lastName || ''}`.trim();
    }
    return actor.username || 'Someone';
  };

  // Get actor avatar URL
  const getActorAvatar = (actor) => {
    if (!actor) return null;
    const photoUrl = getMediaUrl(actor.profile?.photoUrl);
    if (photoUrl) return photoUrl;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(getActorName(actor))}&background=6366f1&color=fff`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>{t('notifications') || 'Notifications'}</h1>
          {unreadCount > 0 && (
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>{unreadCount} {t('unread') || 'unread'}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className={`text-sm font-medium ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
              } disabled:opacity-50`}
          >
            {markAllAsReadMutation.isPending ? (t('loading') || 'Loading...') : (t('markAllAsRead') || 'Mark all as read')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'like', 'comment', 'follow'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${filter === type
              ? 'bg-indigo-600 text-white'
              : isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {type === 'all' ? (t('all') || 'All') :
              type === 'like' ? (t('likes') || 'Likes') :
                type === 'comment' ? (t('comments') || 'Comments') :
                  (t('follows') || 'Follows')}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : error ? (
        <div className={`rounded-3xl p-12 text-center ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-600'
          }`}>
          <p className="text-red-500">{t('error') || 'Error'}: {error.message}</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className={`rounded-3xl p-12 text-center ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-600'
          }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
            <HeartIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
          </div>
          <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>{t('noNotifications') || 'No notifications yet'}</h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            {t('noNotificationsMessage') || 'When someone interacts with you, you\'ll see it here'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer group ${notification.isRead
                ? isDarkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'
                : isDarkMode ? 'bg-indigo-900/20 hover:bg-indigo-900/30' : 'bg-indigo-50 hover:bg-indigo-100'
                }`}
            >
              {/* Actor Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={getActorAvatar(notification.actor)}
                  alt={getActorName(notification.actor)}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${getNotificationBg(notification.type, isDarkMode)
                  } flex items-center justify-center border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'
                  }`}>
                  <NotificationIcon type={notification.type} />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={isDarkMode ? 'text-gray-200' : 'text-gray-800'}>
                  <span className="font-semibold">{getActorName(notification.actor)}</span>{' '}
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                    {getNotificationMessage(notification.type, t)}
                  </span>
                </p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                  {notification.createdAt
                    ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                    : t('now') || 'Just now'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {notification.type === 'FOLLOW_REQUEST' ? (
                  <div className="flex gap-2 min-w-[140px] justify-end">
                    {(() => {
                      const currentStatus = requestStatus[notification.id] || notification.requestStatus || 'PENDING';

                      if (currentStatus === 'ACCEPTED') {
                        return (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg animate-in fade-in duration-200">
                            <Check className="w-4 h-4" />
                            <span className="text-xs font-semibold">{t('accepted') || 'Accepted'}</span>
                          </div>
                        );
                      }

                      if (currentStatus === 'REFUSED' || currentStatus === 'REJECTED') {
                        return (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg animate-in fade-in duration-200">
                            <X className="w-4 h-4" />
                            <span className="text-xs font-semibold">{t('rejected') || 'Rejected'}</span>
                          </div>
                        );
                      }

                      // Only show buttons if pending
                      return (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowRequest(notification, true);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200/50"
                          >
                            {t('accept')}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowRequest(notification, false);
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${isDarkMode
                              ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            {t('decline')}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotificationMutation.mutate(notification.id);
                      }}
                      className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                        }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}