import React from 'react';
import { FeedIcon, SearchIcon, BellIcon, UsersIcon, UserIcon, CogIcon, PlusIcon, LogOutIcon } from '../ui/Icons';
import * as base44 from '@/api/base44Client';

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
  const navItems = [
    { id: 'feed', icon: FeedIcon, label: 'Feed' },
    { id: 'search', icon: SearchIcon, label: 'Search' },
    { id: 'notifications', icon: BellIcon, label: 'Notifications', badge: unreadNotifications },
    { id: 'communities', icon: UsersIcon, label: 'Communities' },
    { id: 'profile', icon: UserIcon, label: 'Profile' },
    { id: 'settings', icon: CogIcon, label: 'Settings' },
  ];

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="h-full flex flex-col bg-white/80 backdrop-blur-xl">
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
            <p className="text-xs text-gray-400">Social Connect</p>
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
            badge={item.badge}
            onClick={() => {
              setActiveTab(item.id);
              onClose?.();
            }}
          />
        ))}
      </nav>

      {/* Create Post Button */}
      <div className="px-4 py-2">
        <button
          onClick={() => {
            setActiveTab('create');
            onClose?.();
          }}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-[1.02]"
        >
          <PlusIcon className="w-5 h-5" />
          Create Post
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff`}
            alt="Profile"
            className="w-11 h-11 rounded-full object-cover ring-2 ring-indigo-100"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{user?.full_name || 'User'}</p>
            <p className="text-sm text-gray-500 truncate">@{user?.handle || user?.email?.split('@')[0]}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
            title="Logout"
          >
            <LogOutIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}