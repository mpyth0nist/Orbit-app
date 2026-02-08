import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SearchIcon, BellIcon, Bars3Icon } from '../ui/Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getMediaUrl } from '../../api/apiClient';
import logoLight from "../../../logo/logoVL.png";
import logoDark from "../../../logo/logoVD.png";

export default function Header({
  onMenuClick,
  onSearchClick,
  onNotificationsClick,
  unreadNotifications,
  user
}) {
  const { t, isDarkMode, isRTL } = useLanguage();
  const { isDarkMode: themeDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const showBadge = user?.notificationsEnabled && unreadNotifications > 0 && location.pathname !== '/notifications';

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDarkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-blue/80 border-gray-100'}`}>

      {/* Mobile Header - Only visible on mobile */}
      <div className={`lg:hidden flex items-center justify-between px-4 py-3`}>
        {/* Left - Menu Button */}
        <button
          onClick={onMenuClick}
          className={`p-2 rounded-xl transition-all duration-200 ${themeDarkMode
            ? 'text-gray-300 hover:bg-gray-800 hover:text-white active:scale-95'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:scale-95'
            }`}
        >
          <Bars3Icon className="w-6 h-6" />
        </button>

        {/* Center - Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <img
            className="w-8 h-8 transition-opacity duration-300"
            src={themeDarkMode ? logoDark : logoLight}
            alt="logo"
          />
          <p className={`text-lg font-bold tracking-wide ${themeDarkMode
            ? 'text-white'
            : 'text-gray-800'
            }`}>
            ORBIT
          </p>
        </div>

        {/* Right - Notifications Button */}
        <button
          onClick={() => navigate('/notifications')}
          className={`p-2 rounded-xl transition-all duration-200 relative ${themeDarkMode
            ? 'text-gray-300 hover:bg-gray-800 hover:text-white active:scale-95'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:scale-95'
            }`}
        >
          <BellIcon className="w-6 h-6" />
          {showBadge && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 animate-pulse">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>
      </div>

      {/* Desktop Header - Only visible on desktop */}
      <div className={`hidden lg:flex items-center justify-end px-4 py-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Right Actions */}
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className={`p-2 rounded-xl transition-colors relative ${themeDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <BellIcon className="w-6 h-6" />
            {showBadge && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* User Avatar */}
          <div className="relative group">
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-gray-100 dark:ring-gray-700 cursor-pointer" onClick={() => navigate('/profile')}>
              {user?.photoUrl ? (
                <img
                  src={getMediaUrl(user.photoUrl)}
                  alt={user.firstName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold">
                  {user?.firstName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}