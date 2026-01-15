import React from 'react';
import { UserIcon, BellIcon, CogIcon, ChevronRightIcon, LogOutIcon, MoonIcon, SunIcon, GlobeIcon } from '../ui/Icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/apiClient';

const SettingsSection = ({ title, children, isDarkMode }) => (
  <div className="mb-6">
    <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 px-1 ${
      isDarkMode ? 'text-gray-400' : 'text-gray-500'
    }`}>
      {title}
    </h3>
    <div className={`rounded-2xl overflow-hidden shadow-sm border ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-100'
    }`}>
      {children}
    </div>
  </div>
);

const SettingsItem = ({ icon: Icon, label, description, onClick, danger, toggle, checked, isDarkMode, showLanguageOptions, currentLanguage, language }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 p-4 transition-colors border-b last:border-b-0 ${
      isDarkMode 
        ? 'hover:bg-gray-700 border-gray-700' 
        : 'hover:bg-gray-50 border-gray-100'
    } ${
      danger ? 'text-rose-600' : isDarkMode ? 'text-gray-100' : 'text-gray-900'
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
      danger ? 'bg-rose-100' : isDarkMode ? 'bg-indigo-900' : 'bg-indigo-100'
    }`}>
      <Icon className={`w-5 h-5 ${danger ? 'text-rose-600' : 'text-indigo-600'}`} />
    </div>
    <div className="flex-1 text-left">
      <p className="font-medium">{label}</p>
      {description && (
        <p className={`text-sm ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>{description}</p>
      )}
    </div>
    {showLanguageOptions ? (
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {language === 'english' ? 'EN' : language === 'french' ? 'FR' : 'AR'}
        </span>
        <ChevronRightIcon className={`w-4 h-4 ${
          isDarkMode ? 'text-gray-500' : 'text-gray-400'
        }`} />
      </div>
    ) : toggle ? (
      <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
        checked ? 'bg-indigo-600' : isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
      }`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </div>
    ) : (
      <ChevronRightIcon className={`w-5 h-5 ${
        isDarkMode ? 'text-gray-500' : 'text-gray-400'
      }`} />
    )}
  </button>
);

export default function SettingsView({ user, onEditProfile }) {
  const [notifications, setNotifications] = React.useState(true);
  const { isDarkMode, toggleTheme } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const [privateAccount, setPrivateAccount] = React.useState(false);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className={`max-w-xl mx-auto ${
      isDarkMode ? 'text-gray-100' : 'text-gray-900'
    }`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${
          isDarkMode ? 'text-gray-100' : 'text-gray-900'
        }`}>{t('settings')}</h1>
        <p className={`mt-1 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>{t('manageAccount')}</p>
      </div>

      {/* Profile Card */}
      <div className={`rounded-3xl p-6 shadow-sm border mb-8 ${
        isDarkMode 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff`}
            alt={user?.full_name}
            className={`w-16 h-16 rounded-full object-cover ring-4 ${
              isDarkMode ? 'ring-indigo-900' : 'ring-indigo-100'
            }`}
          />
          <div className="flex-1">
            <h2 className={`text-lg font-bold ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>{user?.full_name || 'User'}</h2>
            <p className={`${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>@{user?.handle || user?.email?.split('@')[0]}</p>
          </div>
          <button
            onClick={onEditProfile}
            className={`px-4 py-2 border-2 font-semibold rounded-xl transition-colors ${
              isDarkMode 
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Edit
          </button>
        </div>
      </div>

      {/* Account Settings */}
      <SettingsSection title="Account" isDarkMode={isDarkMode}>
        <SettingsItem
          icon={UserIcon}
          label={t('editProfile')}
          description="Update your name, bio, and photo"
          onClick={onEditProfile}
          isDarkMode={isDarkMode}
        />
        <SettingsItem
          icon={() => <span className="text-lg">🔒</span>}
          label={t('privacy')}
          description="Manage who can see your content"
          toggle
          checked={privateAccount}
          onClick={() => setPrivateAccount(!privateAccount)}
          isDarkMode={isDarkMode}
        />
        <SettingsItem
          icon={() => <span className="text-lg">🔐</span>}
          label={t('security')}
          description="Password, two-factor authentication"
          onClick={() => {}}
          isDarkMode={isDarkMode}
        />
      </SettingsSection>

      {/* Preferences */}
      <SettingsSection title="Preferences" isDarkMode={isDarkMode}>
        <SettingsItem
          icon={BellIcon}
          label="Notifications"
          description="Push, email, and in-app notifications"
          toggle
          checked={notifications}
          onClick={() => setNotifications(!notifications)}
          isDarkMode={isDarkMode}
        />
        <SettingsItem
          icon={isDarkMode ? MoonIcon : SunIcon}
          label={t('darkMode')}
          description={t('darkModeDesc')}
          toggle
          checked={isDarkMode}
          onClick={toggleTheme}
          isDarkMode={isDarkMode}
        />
        <SettingsItem
          icon={GlobeIcon}
          label={t('language')}
          description={t('languageDesc')}
          showLanguageOptions
          currentLanguage={language}
          language={language}
          onClick={() => {
            if (language === 'english') {
              changeLanguage('french');
            } else if (language === 'french') {
              changeLanguage('arabic');
            } else {
              changeLanguage('english');
            }
          }}
          isDarkMode={isDarkMode}
        />
      </SettingsSection>

      {/* Support */}
      <SettingsSection title="Support" isDarkMode={isDarkMode}>
        <SettingsItem
          icon={() => <span className="text-lg">❓</span>}
          label={t('helpCenter')}
          description="Get help with your account"
          onClick={() => {}}
          isDarkMode={isDarkMode}
        />
        <SettingsItem
          icon={() => <span className="text-lg">📝</span>}
          label={t('sendFeedback')}
          description="Help us improve app"
          onClick={() => {}}
          isDarkMode={isDarkMode}
        />
        <SettingsItem
          icon={() => <span className="text-lg">📋</span>}
          label={t('termsOfService')}
          onClick={() => {}}
          isDarkMode={isDarkMode}
        />
        <SettingsItem
          icon={() => <span className="text-lg">🔏</span>}
          label={t('privacyPolicy')}
          onClick={() => {}}
          isDarkMode={isDarkMode}
        />
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title="Danger Zone" isDarkMode={isDarkMode}>
        <SettingsItem
          icon={LogOutIcon}
          label={t('logout')}
          description="Sign out of your account"
          danger
          onClick={handleLogout}
          isDarkMode={isDarkMode}
        />
      </SettingsSection>
    </div>
  );
}