import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, UserIcon } from './Icons';
import { usersAPI, getMediaUrl } from '../../api/apiClient';
import { Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * FollowersModal - Stylish minimalist modal for followers/following list
 */
export default function FollowersModal({
    isOpen,
    onClose,
    targetUserId = null, // userId to fetch for (null = current user)
    type = 'followers', // 'followers' or 'following'
    onUserClick
}) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { isDarkMode } = useTheme();

    const fetchUsers = useCallback(async () => {
        if (!isOpen) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = type === 'followers'
                ? await usersAPI.getFollowers(targetUserId, { limit: 50 })
                : await usersAPI.getFollowing(targetUserId, { limit: 50 });

            // Handle response format
            const userData = response?.data || response?.users || response || [];
            setUsers(Array.isArray(userData) ? userData : []);
        } catch (err) {
            console.error(`Failed to load ${type}:`, err);
            setError(err.response?.data?.message || `Failed to load ${type}`);
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, type, targetUserId]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const getDisplayName = (user) => {
        const profile = user.profile || user;
        if (profile.firstName || profile.lastName) {
            return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
        }
        return user.username || 'User';
    };

    const getAvatarUrl = (user) => {
        const photoUrl = getMediaUrl(user.profile?.photoUrl || user.photoUrl);
        if (photoUrl) return photoUrl;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(user))}&background=6366f1&color=fff&size=96`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-md max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'
                }`}>
                {/* Header */}
                <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
                    }`}>
                    <h2 className={`text-lg font-bold capitalize ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                        {type}
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors ${isDarkMode
                            ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className={`text-center py-12 px-6 ${isDarkMode ? 'text-red-400' : 'text-red-500'
                            }`}>
                            <p>{error}</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12 px-6">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                                }`}>
                                <UserIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'
                                    }`} />
                            </div>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                {type === 'followers'
                                    ? "No followers found"
                                    : "Not following anyone yet"}
                            </p>
                        </div>
                    ) : (
                        <div className="py-2">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    onClick={() => {
                                        onUserClick?.(user);
                                        onClose();
                                    }}
                                    className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors ${isDarkMode
                                        ? 'hover:bg-gray-800/50'
                                        : 'hover:bg-gray-50'
                                        }`}
                                >
                                    {/* Avatar */}
                                    <img
                                        src={getAvatarUrl(user)}
                                        alt={getDisplayName(user)}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />

                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                            }`}>
                                            {getDisplayName(user)}
                                        </p>
                                        <p className={`text-sm truncate ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                            }`}>
                                            @{user.username}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
