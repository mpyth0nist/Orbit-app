import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/apiClient';
import { Search, User, FileText, Hash, TrendingUp, Clock, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ContentRenderer from '../ui/ContentRenderer';
import { getMediaUrl } from '../../api/apiClient';
import PostCard from '../feed/PostCard';

const SearchView = ({ onLike, onShare, onBookmark }) => {

  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // Tab and Search State
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'threads'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);



  // Results for each tab
  const [userResults, setUserResults] = useState([]);
  const [threadResults, setThreadResults] = useState([]);

  // Recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState([]);

  // Load recent searches on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);



  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search based on active tab
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setUserResults([]);
      setThreadResults([]);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        if (activeTab === 'users') {
          const data = await api.search.searchUsers(debouncedQuery);
          setUserResults(data?.users || []);
        } else if (activeTab === 'threads') {
          const data = await api.search.searchThreads({ q: debouncedQuery, page: 1, limit: 20 });
          setThreadResults(data?.threads || []);
        }
        //  else if (activeTab === 'hashtags') {
        //   const data = await api.search.searchHashtags(debouncedQuery);
        //   setHashtagResults(data || []);
        // }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [debouncedQuery, activeTab]);

  const handleUserClick = (userId) => {
    // Save to recent searches
    const newRecent = { type: 'user', userId, query: searchQuery, timestamp: Date.now() };
    const updated = [newRecent, ...recentSearches.filter(r => !(r.type === 'user' && r.userId === userId))].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));

    // Navigate to profile page
    navigate(`/profile/${userId}`);
  };

  const handleThreadClick = (threadId) => {
    // Navigate to thread detail page (singular /thread/:id)
    navigate(`/thread/${threadId}`);
  };


  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const tabs = [
    { id: 'users', label: 'Users', icon: User },
    { id: 'threads', label: 'Threads', icon: FileText }
  ];




  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Search size={20} />
        </div>
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all shadow-sm"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                ? 'bg-blue-400 text-white shadow-md'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search Content */}
      <div className="min-h-[400px]">
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-gray-500 dark:text-gray-400">Searching...</p>
          </div>
        )}

        {/* Recent Searches (Empty State) */}
        {!searchQuery && recentSearches.length > 0 && activeTab === 'users' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock size={20} />
                <h3 className="text-lg font-bold">Recent Searches</h3>
              </div>
              <button
                onClick={clearRecentSearches}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {recentSearches.filter(r => r.type === 'user').map((recent, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleUserClick(recent.userId)}
                >
                  <Search size={16} className="text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{recent.query}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Results */}
        {!isSearching && searchQuery && activeTab === 'users' && (
          <div className="flex flex-col gap-2">
            {userResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <User size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                <p>No users found for "{searchQuery}"</p>
              </div>
            ) : (
              userResults.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
                  onClick={() => handleUserClick(user.id)}
                >
                  <img
                    src={getMediaUrl(user.profile?.photoUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random&color=fff&size=128`}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover border border-gray-100 dark:border-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {user.profile?.firstName} {user.profile?.lastName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">@{user.username}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Thread Results */}
        {!isSearching && searchQuery && activeTab === 'threads' && (
          <div className="flex flex-col gap-4">
            {threadResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <FileText size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                <p>No threads found for "{searchQuery}"</p>
              </div>
            ) : (
              threadResults.map(thread => (
                <PostCard
                  key={thread.id}
                  post={thread}
                  onLike={onLike}
                  onShare={onShare}
                  onBookmark={onBookmark}
                  onClick={() => handleThreadClick(thread.id)}
                  isLiked={thread.isLiked}
                  isBookmarked={thread.isSaved}
                  isOwnPost={currentUser?.id === thread.userId || currentUser?.id === thread.user?.id}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;