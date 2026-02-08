import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import logoLight from "../../../logo/logoVL.png";
import logoDark from "../../../logo/logoVD.png";
import {
  FeedIcon,
  SearchIcon,
  BellIcon,
  UsersIcon,
  UserIcon,
  CogIcon,
  PlusIcon,
  LogOutIcon
} from '../ui/Icons';
import { getMediaUrl } from '../../api/apiClient';

const SidebarBtn = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${active
      ? 'bg-gradient-to-r from-blue-400 to-blue-400 text-white shadow-lg shadow-blue-500/30'
      : 'text-gray-600 hover:bg-gray-100/80'
      }`}
  >
    <Icon className={`w-6 h-6 transition-transform duration-300 ${active ? '' : 'group-hover:scale-110'}`} />
    <span className="font-medium text-[15px]">{label}</span>
    {badge > 0 && !active && (
      <span className="absolute right-4 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);

export default function Sidebar({ activeTab, setActiveTab, unreadNotifications, onClose, user }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isDarkMode } = useTheme();

  const navItems = [
    { id: 'feed', icon: FeedIcon, label: t('feed'), path: '/' },
    { id: 'search', icon: SearchIcon, label: t('search'), path: '/search' },
    { id: 'notifications', icon: BellIcon, label: t('notifications'), badge: user?.notificationsEnabled ? unreadNotifications : 0, path: '/notifications' },
    { id: 'communities', icon: UsersIcon, label: t('communities'), path: '/communities' },
    { id: 'profile', icon: UserIcon, label: t('profile'), path: '/profile' },
    { id: 'settings', icon: CogIcon, label: t('settings'), path: '/settings' },
  ];

  const handleNavigation = (path, tabId) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleCreatePost = () => {
    navigate('/create');
    if (onClose) onClose();
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white/80'
      } backdrop-blur-xl`}>
      {/* Logo */}
      <div className="p-6 pt-4 pb-3.5">
        <div className="flex items-center gap-3">
          <img
            className="w-12 h-12 transition-opacity duration-300"
            src={isDarkMode ? logoDark : logoLight}
            alt="logo"
          />
          <p className={`text-lg font-semibold ${isDarkMode ? 'text-white-800' : 'text-gray-800'}`}>ORBIT</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarBtn
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeTab === item.id}
            onClick={() => handleNavigation(item.path, item.id)}
            badge={item.badge}
          />
        ))}
      </nav>

      {/* Create Post Button */}
      <div className="px-4 pb-4">
        <SidebarBtn
          icon={PlusIcon}
          label={t('createPost')}
          active={activeTab === 'create'}
          onClick={handleCreatePost}
        />
      </div>

      {/* User Section */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200/50'
        }`}>
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold shadow-lg overflow-hidden`}>
              {user?.photoUrl ? (
                <img src={getMediaUrl(user.photoUrl)} alt={user.firstName} className="w-full h-full object-cover" />
              ) : (
                user?.firstName?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate text-sm leading-tight ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'User'}
              </p>
              <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                @{user?.username || 'user'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`p-2 rounded-xl transition-colors ${isDarkMode
              ? 'text-red-400 hover:bg-red-900/20'
              : 'text-red-500 hover:bg-red-50/80'
              }`}
          >
            <LogOutIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}