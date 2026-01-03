import React from 'react';
import { UserIcon, BellIcon, CogIcon, ChevronRightIcon, LogOutIcon } from '../ui/Icons';
import * as base44  from '@/api/base44Client';

const SettingsSection = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 px-1">
      {title}
    </h3>
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {children}
    </div>
  </div>
);

const SettingsItem = ({ icon: Icon, label, description, onClick, danger, toggle, checked }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
      danger ? 'text-rose-600' : 'text-gray-900'
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
      danger ? 'bg-rose-100' : 'bg-indigo-100'
    }`}>
      <Icon className={`w-5 h-5 ${danger ? 'text-rose-600' : 'text-indigo-600'}`} />
    </div>
    <div className="flex-1 text-left">
      <p className="font-medium">{label}</p>
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
    </div>
    {toggle ? (
      <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-gray-200'
      }`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </div>
    ) : (
      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
    )}
  </button>
);

export default function SettingsView({ user, onEditProfile }) {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [privateAccount, setPrivateAccount] = React.useState(false);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff`}
            alt={user?.full_name}
            className="w-16 h-16 rounded-full object-cover ring-4 ring-indigo-100"
          />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{user?.full_name || 'User'}</h2>
            <p className="text-gray-500">@{user?.handle || user?.email?.split('@')[0]}</p>
          </div>
          <button
            onClick={onEditProfile}
            className="px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Account Settings */}
      <SettingsSection title="Account">
        <SettingsItem
          icon={UserIcon}
          label="Edit Profile"
          description="Update your name, bio, and photo"
          onClick={onEditProfile}
        />
        <SettingsItem
          icon={() => <span className="text-lg">🔒</span>}
          label="Privacy"
          description="Manage who can see your content"
          toggle
          checked={privateAccount}
          onClick={() => setPrivateAccount(!privateAccount)}
        />
        <SettingsItem
          icon={() => <span className="text-lg">🔐</span>}
          label="Security"
          description="Password, two-factor authentication"
          onClick={() => {}}
        />
      </SettingsSection>

      {/* Preferences */}
      <SettingsSection title="Preferences">
        <SettingsItem
          icon={BellIcon}
          label="Notifications"
          description="Push, email, and in-app notifications"
          toggle
          checked={notifications}
          onClick={() => setNotifications(!notifications)}
        />
        <SettingsItem
          icon={() => <span className="text-lg">🌙</span>}
          label="Dark Mode"
          description="Switch between light and dark themes"
          toggle
          checked={darkMode}
          onClick={() => setDarkMode(!darkMode)}
        />
        <SettingsItem
          icon={() => <span className="text-lg">🌐</span>}
          label="Language"
          description="English (US)"
          onClick={() => {}}
        />
      </SettingsSection>

      {/* Support */}
      <SettingsSection title="Support">
        <SettingsItem
          icon={() => <span className="text-lg">❓</span>}
          label="Help Center"
          description="Get help with your account"
          onClick={() => {}}
        />
        <SettingsItem
          icon={() => <span className="text-lg">📝</span>}
          label="Send Feedback"
          description="Help us improve the app"
          onClick={() => {}}
        />
        <SettingsItem
          icon={() => <span className="text-lg">📋</span>}
          label="Terms of Service"
          onClick={() => {}}
        />
        <SettingsItem
          icon={() => <span className="text-lg">🔏</span>}
          label="Privacy Policy"
          onClick={() => {}}
        />
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title="Danger Zone">
        <SettingsItem
          icon={LogOutIcon}
          label="Log Out"
          description="Sign out of your account"
          danger
          onClick={handleLogout}
        />
      </SettingsSection>

      {/* App Version */}
      <div className="text-center py-6">
        <p className="text-sm text-gray-400">Nexus v1.0.0</p>
        <p className="text-xs text-gray-300 mt-1">Made with ❤️</p>
      </div>
    </div>
  );
}