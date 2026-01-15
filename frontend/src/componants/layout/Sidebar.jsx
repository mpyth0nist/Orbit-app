import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
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

const SidebarBtn = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative ${
      active 
        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30' 
        : 'text-gray-600 hover:bg-gray-100/80'
    }`}
  >
    <Icon className={`w-6 h-6 transition-transform duration-300 ${active ? '' : 'group-hover:scale-110'}`} />
    <span className="font-medium text-[15px]">{label}</span>
    {badge > 0 && (
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
    { id: 'notifications', icon: BellIcon, label: t('notifications'), badge: unreadNotifications, path: '/notifications' },
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
    navigate('/login');
  };

  return (
    <div className={`h-full flex flex-col ${
      isDarkMode ? 'bg-gray-900' : 'bg-white/80'
    } backdrop-blur-xl`}>
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white font-bold text-xl">O</span>
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Orbit
            </h1>
            <p className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-400'
            }`}>Social Connect</p>
          </div>
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
      <div className={`p-4 border-t ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200/50'
      }`}>
        <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white font-semibold shadow-lg`}>
            {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold truncate ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>
              {user?.full_name || 'User'}
            </p>
            <p className={`text-sm truncate ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              @{user?.handle || user?.email?.split('@')[0]}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className={`p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors ${
            isDarkMode 
              ? 'text-red-400 hover:bg-red-900/20' 
              : 'text-red-500 hover:bg-red-50/80'
          }`}
        >
          <LogOutIcon className="w-5 h-5" />
          {/* <span className="font-medium text-[15px]">{t('logout')}</span> */}
        </button>
</div>
      </div>
    </div>
  );
}