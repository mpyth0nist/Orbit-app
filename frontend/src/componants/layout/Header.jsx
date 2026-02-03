import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SearchIcon, BellIcon, Bars3Icon } from '../ui/Icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

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
  const showBadge = unreadNotifications > 0 && location.pathname !== '/notifications';
  return (
    <header className={`sticky top-0 z-40 backdrop-blur-xl border-b ${isDarkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-100'
      }`}>
      <div className={`flex items-center justify-between px-4 py-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'
        }`}>
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className={`lg:hidden p-2 rounded-xl transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
            } ${isRTL ? '-mr-2' : '-ml-2'}`}
        >
          <Bars3Icon className="w-6 h-6" />
        </button>

        {/* Logo (Mobile) */}
        <div className="lg:hidden flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">O</span>
          </div>
        </div>

        {/* Search Bar (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-xl">
          <button
            onClick={onSearchClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${isDarkMode
                ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                : 'bg-gray-100/80 text-gray-500 hover:bg-gray-100'
              }`}
          >
            <SearchIcon className="w-5 h-5" />
            <span className="text-sm">{t('searchPlaceholder')}</span>
            <kbd className={`${isRTL ? 'mr-auto' : 'ml-auto'} text-xs px-2 py-1 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
              }`}>⌘K</kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'
          }`}>
          <button
            onClick={onSearchClick}
            className={`lg:hidden p-2 rounded-xl transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <SearchIcon className="w-6 h-6" />
          </button>

          <button
            onClick={() => navigate('/notifications')}
            className={`p-2 rounded-xl transition-colors relative ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
          >
            <BellIcon className="w-6 h-6" />
            {showBadge && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* User Avatar (Desktop) */}
          <div className="hidden lg:block">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff`}
              alt={t('profile')}
              className={`w-9 h-9 rounded-full object-cover ring-2 cursor-pointer transition-all ${isDarkMode ? 'ring-indigo-900 hover:ring-indigo-700' : 'ring-indigo-100 hover:ring-indigo-300'
                }`}
              onClick={() => navigate('/profile')}
            />
          </div>
        </div>
      </div>
    </header>
  );
}