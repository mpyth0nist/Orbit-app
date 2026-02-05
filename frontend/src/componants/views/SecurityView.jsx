import React, { useState } from 'react';
import { ArrowLeftIcon, LockClosedIcon } from '../ui/Icons';
import { usersAPI } from '../../api/apiClient';
import { Loader2, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function SecurityView({ onBack }) {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const { t } = useLanguage();
    const { isDarkMode } = useTheme();

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        setError(null);
        setSuccessMessage(null);

        // Validation
        if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
            setError(t('allFieldsRequired') || 'All fields are required');
            return;
        }

        if (formData.newPassword.length < 8) {
            setError(t('passwordTooShort') || 'New password must be at least 8 characters');
            return;
        }

        if (formData.newPassword !== formData.confirmPassword) {
            setError(t('passwordsDoNotMatch') || 'Passwords do not match');
            return;
        }

        if (formData.newPassword === formData.currentPassword) {
            setError(t('newPasswordSameAsOld') || 'New password cannot be the same as current password');
            return;
        }

        setIsSaving(true);
        try {
            await usersAPI.updatePassword({
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });

            setSuccessMessage(t('passwordUpdatedSuccess') || 'Password updated successfully!');
            setFormData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });

            // Redirect back after success
            setTimeout(() => {
                onBack();
            }, 1500);
        } catch (err) {
            console.error('Password update error:', err);
            setError(err.response?.data?.message || t('passwordUpdateError') || 'Failed to update password');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className={`p-2 -ml-2 rounded-xl transition-colors ${isDarkMode
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}>{t('securitySettings') || 'Security Settings'}</h1>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isSaving || !!successMessage}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('updating') || 'Updating...'}
                        </>
                    ) : successMessage ? (
                        <>
                            <Check className="w-4 h-4" />
                            {t('updated') || 'Updated!'}
                        </>
                    ) : (
                        t('updatePassword') || 'Update Password'
                    )}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className={`mb-4 p-4 rounded-2xl flex items-center gap-3 ${isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
                    }`}>
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Success Message */}
            {successMessage && (
                <div className={`mb-4 p-4 rounded-2xl flex items-center gap-3 ${isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-600'
                    }`}>
                    <Check className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-medium">{successMessage}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className={`rounded-3xl p-6 shadow-sm border ${isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-100'
                }`}>
                <div className="flex items-center gap-4 mb-8">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                        <LockClosedIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className={`font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{t('changePassword') || 'Change Password'}</h2>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('secureAccountDesc') || 'Ensure your account is using a long, random password to stay secure.'}</p>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Current Password */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {t('currentPassword') || 'Current Password'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.current ? 'text' : 'password'}
                                value={formData.currentPassword}
                                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                                    }`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('current')}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-400 hover:bg-gray-100'}`}
                            >
                                {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div className={`h-px w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />

                    {/* New Password */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {t('newPassword') || 'New Password'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.new ? 'text' : 'password'}
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                                    }`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('new')}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-400 hover:bg-gray-100'}`}
                            >
                                {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {t('passwordRequirement') || 'Must be at least 8 characters long.'}
                        </p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {t('confirmNewPassword') || 'Confirm New Password'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className={`w-full pl-4 pr-12 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500'
                                    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                                    }`}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => togglePasswordVisibility('confirm')}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:bg-gray-600' : 'text-gray-400 hover:bg-gray-100'}`}
                            >
                                {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
