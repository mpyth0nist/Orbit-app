import React from 'react';
import { UserIcon, BellIcon, CogIcon, ChevronRightIcon, LogOutIcon, MoonIcon, SunIcon, GlobeIcon } from '../ui/Icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api, { getMediaUrl } from '../../api/apiClient';

const SettingsSection = ({ title, children, isDarkMode }) => (
  <div className="mb-6">
    <h3 className={`text-sm font-semibold uppercase tracking-wide mb-3 px-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
      }`}>
      {title}
    </h3>
    <div className={`rounded-2xl overflow-hidden shadow-sm border ${isDarkMode
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
    className={`w-full flex items-center gap-4 p-4 transition-colors border-b last:border-b-0 ${isDarkMode
      ? 'hover:bg-gray-700 border-gray-700'
      : 'hover:bg-gray-50 border-gray-100'
      } ${danger ? 'text-rose-600' : isDarkMode ? 'text-gray-100' : 'text-gray-900'
      }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? 'bg-rose-100' : isDarkMode ? 'bg-indigo-900' : 'bg-indigo-100'
      }`}>
      <Icon className={`w-5 h-5 ${danger ? 'text-rose-600' : 'text-indigo-600'}`} />
    </div>
    <div className="flex-1 text-left">
      <p className="font-medium">{label}</p>
      {description && (
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>{description}</p>
      )}
    </div>
    {showLanguageOptions ? (
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
          {language === 'english' ? 'EN' : language === 'french' ? 'FR' : 'AR'}
        </span>
        <ChevronRightIcon className={`w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
      </div>
    ) : toggle ? (
      <div className={`w-12 h-7 rounded-full p-1 transition-colors ${checked ? 'bg-indigo-600' : isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
        }`}>
        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'
          }`} />
      </div>
    ) : (
      <ChevronRightIcon className={`w-5 h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
        }`} />
    )}
  </button>
);

export default function SettingsView({ user, onEditProfile }) {
  const [notifications, setNotifications] = React.useState(true);
  const { isDarkMode, toggleTheme } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const { logout } = useAuth();
  const [privateAccount, setPrivateAccount] = React.useState(user?.type === 'PRIVATE');
  const [isSavingPrivacy, setIsSavingPrivacy] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Toggle privacy and persist to backend
  const handlePrivacyToggle = async () => {
    const newValue = !privateAccount;
    setPrivateAccount(newValue); // Optimistic update
    setIsSavingPrivacy(true);

    try {
      await api.users.updateMe({ type: newValue ? 'PRIVATE' : 'PUBLIC' });
    } catch (error) {
      console.error('Failed to update privacy setting:', error);
      setPrivateAccount(!newValue); // Rollback on error
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  // Get display name from user data
  const displayName = React.useMemo(() => {
    if (user?.profile?.firstName || user?.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user?.username || 'User';
  }, [user?.profile?.firstName, user?.profile?.lastName, user?.username]);

  // Get avatar URL
  const avatarUrl = React.useMemo(() => {
    const photoUrl = getMediaUrl(user?.profile?.photoUrl);
    if (photoUrl) return photoUrl;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`;
  }, [user?.profile?.photoUrl, displayName]);

  return (
    <>
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={cancelLogout}
          />
          <div className={`relative z-10 w-full max-w-sm rounded-2xl p-6 shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
            <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>{t('confirmLogout') || 'Confirm Logout'}</h3>
            <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>{t('confirmLogoutMessage') || 'Are you sure you want to log out of your account?'}</p>
            <div className="flex gap-3">
              <button
                onClick={cancelLogout}
                className={`flex-1 py-2.5 font-semibold rounded-xl transition-colors ${isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-2.5 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-colors"
              >
                {t('logout') || 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-xl mx-auto ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
        }`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}>{t('settings')}</h1>
          <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>{t('manageAccount')}</p>
        </div>

        {/* Profile Card */}
        <div className={`rounded-3xl p-6 shadow-sm border mb-8 ${isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-100'
          }`}>
          <div className="flex items-center gap-4">
            <img
              src={avatarUrl}
              alt={displayName}
              className={`w-16 h-16 rounded-full object-cover ring-4 ${isDarkMode ? 'ring-indigo-900' : 'ring-indigo-100'
                }`}
            />
            <div className="flex-1">
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>{displayName}</h2>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>@{user?.username || 'user'}</p>
            </div>
            <button
              onClick={onEditProfile}
              className={`px-4 py-2 border-2 font-semibold rounded-xl transition-colors ${isDarkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
            >
              {t('edit') || 'Edit'}
            </button>
          </div>
        </div>

        {/* Account Settings */}
        <SettingsSection title={t('account') || 'Account'} isDarkMode={isDarkMode}>
          <SettingsItem
            icon={UserIcon}
            label={t('editProfile')}
            description={t('editProfileDesc') || 'Update your name, bio, and photo'}
            onClick={onEditProfile}
            isDarkMode={isDarkMode}
          />
          <SettingsItem
            icon={() => <span className="text-lg">🔒</span>}
            label={t('privacy')}
            description={t('privacyDesc') || 'Manage who can see your content'}
            toggle
            checked={privateAccount}
            onClick={handlePrivacyToggle}
            isDarkMode={isDarkMode}
          />
          <SettingsItem
            icon={() => <span className="text-lg">🔐</span>}
            label={t('security')}
            description={t('securityDesc') || 'Password, two-factor authentication'}
            onClick={() => { }}
            isDarkMode={isDarkMode}
          />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title={t('preferences') || 'Preferences'} isDarkMode={isDarkMode}>
          <SettingsItem
            icon={BellIcon}
            label={t('notifications') || 'Notifications'}
            description={t('notificationsDesc') || 'Push, email, and in-app notifications'}
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
        <SettingsSection title={t('support') || 'Support'} isDarkMode={isDarkMode}>
          <SettingsItem
            icon={() => <span className="text-lg">❓</span>}
            label={t('helpCenter')}
            description={t('helpCenterDesc') || 'Get help with your account'}
            onClick={() => { }}
            isDarkMode={isDarkMode}
          />
          <SettingsItem
            icon={() => <span className="text-lg">📝</span>}
            label={t('sendFeedback')}
            description={t('sendFeedbackDesc') || 'Help us improve the app'}
            onClick={() => { }}
            isDarkMode={isDarkMode}
          />
          <SettingsItem
            icon={() => <span className="text-lg">📋</span>}
            label={t('termsOfService')}
            onClick={() => { }}
            isDarkMode={isDarkMode}
          />
          <SettingsItem
            icon={() => <span className="text-lg">🔏</span>}
            label={t('privacyPolicy')}
            onClick={() => { }}
            isDarkMode={isDarkMode}
          />
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title={t('dangerZone') || 'Danger Zone'} isDarkMode={isDarkMode}>
          <SettingsItem
            icon={LogOutIcon}
            label={t('logout')}
            description={t('logoutDesc') || 'Sign out of your account'}
            danger
            onClick={handleLogout}
            isDarkMode={isDarkMode}
          />
        </SettingsSection>
      </div>
    </>
  );
}