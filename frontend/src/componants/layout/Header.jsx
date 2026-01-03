import React from 'react';
import { SearchIcon, BellIcon, Bars3Icon } from '../ui/Icons';

export default function Header({ 
  onMenuClick, 
  onSearchClick, 
  onNotificationsClick, 
  unreadNotifications,
  user 
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
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
            className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-100/80 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <SearchIcon className="w-5 h-5" />
            <span className="text-sm">Search anything...</span>
            <kbd className="ml-auto text-xs bg-white px-2 py-1 rounded-lg border border-gray-200">⌘K</kbd>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSearchClick}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <SearchIcon className="w-6 h-6" />
          </button>
          
          <button
            onClick={onNotificationsClick}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors relative"
          >
            <BellIcon className="w-6 h-6" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* User Avatar (Desktop) */}
          <div className="hidden lg:block">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff`}
              alt="Profile"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-100 cursor-pointer hover:ring-indigo-300 transition-all"
            />
          </div>
        </div>
      </div>
    </header>
  );
}