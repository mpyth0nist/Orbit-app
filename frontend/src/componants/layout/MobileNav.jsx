import React from 'react';
import { FeedIcon, SearchIcon, PlusIcon, BellIcon, UserIcon } from '../ui/Icons';

const MobileNavBtn = ({ icon: Icon, active, onClick, badge, isCreate }) => (
  <button
    onClick={onClick}
    className={`relative flex flex-col items-center justify-center py-2 px-4 transition-all duration-300 ${
      isCreate 
        ? '' 
        : active 
          ? 'text-indigo-600' 
          : 'text-gray-400 hover:text-gray-600'
    }`}
  >
    {isCreate ? (
      <div className="w-12 h-12 -mt-6 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
        <Icon className="w-6 h-6 text-white" />
      </div>
    ) : (
      <>
        <Icon className={`w-6 h-6 transition-transform duration-300 ${active ? 'scale-110' : ''}`} />
        {badge > 0 && (
          <span className="absolute top-1 right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
        {active && (
          <div className="w-1 h-1 mt-1 bg-indigo-600 rounded-full" />
        )}
      </>
    )}
  </button>
);

export default function MobileNav({ activeTab, setActiveTab, unreadNotifications }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/90 backdrop-blur-xl border-t border-gray-100 safe-area-bottom">
      <div className="flex items-center justify-around px-2">
        <MobileNavBtn
          icon={FeedIcon}
          active={activeTab === 'feed'}
          onClick={() => setActiveTab('feed')}
        />
        <MobileNavBtn
          icon={SearchIcon}
          active={activeTab === 'search'}
          onClick={() => setActiveTab('search')}
        />
        <MobileNavBtn
          icon={PlusIcon}
          isCreate
          onClick={() => setActiveTab('create')}
        />
        <MobileNavBtn
          icon={BellIcon}
          active={activeTab === 'notifications'}
          badge={unreadNotifications}
          onClick={() => setActiveTab('notifications')}
        />
        <MobileNavBtn
          icon={UserIcon}
          active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
        />
      </div>
    </nav>
  );
}