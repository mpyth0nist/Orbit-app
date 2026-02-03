import React, { useState, useEffect, useCallback } from 'react';
import { SearchIcon, XMarkIcon, UserIcon } from '../ui/Icons';
import api from '../../api/apiClient';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import UserProfileView from './UserProfileView';

export default function SearchView({ onPostClick, currentUserEmail, currentUserId }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('recentUserSearches');
    return saved ? JSON.parse(saved) : [];
  });
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const { t } = useLanguage();
  const { isDarkMode } = useTheme();

  // Save recent searches to localStorage
  useEffect(() => {
    localStorage.setItem('recentUserSearches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  const handleSearch = useCallback(async (searchQuery) => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setError(null);
      return;
    }

    // Backend requires minimum 2 characters
    if (trimmedQuery.length < 2) {
      setSearchResults([]);
      setError('Search term must be at least 2 characters');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await api.users.search({ q: trimmedQuery, limit: 20 });

      // Handle the backend response format: { users, pagination }
      const users = response?.users || response || [];
      setSearchResults(Array.isArray(users) ? users : []);

      // Add to recent searches if we got results
      if (users.length > 0 && !recentSearches.includes(trimmedQuery)) {
        setRecentSearches(prev => [trimmedQuery, ...prev.slice(0, 4)]);
      }
    } catch (err) {
      console.error('User search failed:', err);
      const errorMessage = err.response?.data?.message || 'Failed to search users';
      setError(errorMessage);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [recentSearches]);

  // Debounced search
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query) handleSearch(query);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, handleSearch]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  const handleBackFromProfile = () => {
    setSelectedUser(null);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentUserSearches');
  };

  const removeRecentSearch = (searchToRemove) => {
    setRecentSearches(prev => prev.filter(s => s !== searchToRemove));
  };

  // Get user display info with fallbacks
  const getUserDisplayName = (user) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.username;
  };

  const getUserAvatar = (user) => {
    return user.profile?.photoUrl || null;
  };

  // Show UserProfileView if a user is selected
  if (selectedUser) {
    return (
      <UserProfileView
        userId={selectedUser.id}
        onBack={handleBackFromProfile}
        onPostClick={onPostClick}
        currentUserId={currentUserId}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative mb-6">
        <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'
          }`} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder') || 'Search users...'}
          className={`w-full pl-12 pr-12 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all ${isDarkMode
              ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500'
              : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 border'
            }`}
          autoFocus
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSearchResults([]);
              setError(null);
            }}
            className={`absolute right-4 top-1/2 -translate-y-1/2 p-1 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'
          }`}>
          {error}
        </div>
      )}

      {/* Search Results */}
      {query && query.length >= 2 && (
        <div className="mb-6">
          {isSearching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              <h3 className={`text-sm font-semibold uppercase tracking-wide mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                {t('searchResults') || 'Results'} for "{query}"
              </h3>
              <div className={`rounded-2xl overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm border border-gray-100'
                }`}>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${isDarkMode
                        ? 'hover:bg-gray-700 border-b border-gray-700 last:border-b-0'
                        : 'hover:bg-gray-50 border-b border-gray-100 last:border-b-0'
                      }`}
                  >
                    {/* Avatar */}
                    {getUserAvatar(user) ? (
                      <img
                        src={getUserAvatar(user)}
                        alt={user.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                        <UserIcon className={`w-6 h-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`} />
                      </div>
                    )}

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}>
                        {getUserDisplayName(user)}
                      </p>
                      <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        @{user.username}
                      </p>
                      {user.profile?.bio && (
                        <p className={`text-sm truncate mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                          {user.profile.bio}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !error && (
            <div className={`text-center py-8 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                <SearchIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`} />
              </div>
              <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                }`}>{t('noResults') || 'No results'}</h3>
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                No users found for "{query}"
              </p>
            </div>
          )}
        </div>
      )}

      {/* Default Content - shown when not searching */}
      {!query && (
        <>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                  }`}>{t('recentSearches') || 'Recent Searches'}</h2>
                <button
                  onClick={clearRecentSearches}
                  className={`text-sm font-medium ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                    }`}
                >
                  {t('clear') || 'Clear'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, i) => (
                  <div
                    key={i}
                    className={`group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${isDarkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <span onClick={() => setQuery(search)}>{search}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(search);
                      }}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Hint */}
          <div className={`text-center py-12 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm border border-gray-100'
            }`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-indigo-50'
              }`}>
              <SearchIcon className={`w-10 h-10 ${isDarkMode ? 'text-gray-400' : 'text-indigo-500'
                }`} />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}>
              {t('searchUsers') || 'Search for Users'}
            </h3>
            <p className={`max-w-sm mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
              Find people by their username, first name, or last name
            </p>
          </div>
        </>
      )}
    </div>
  );
}