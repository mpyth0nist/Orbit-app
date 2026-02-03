import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/apiClient';
import { Search, User, FileText, Hash, TrendingUp, Clock, X } from 'lucide-react';

const SearchView = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'threads', 'hashtags'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Results for each tab
  const [userResults, setUserResults] = useState([]);
  const [threadResults, setThreadResults] = useState([]);
  const [hashtagResults, setHashtagResults] = useState([]);
  const [trendingHashtags, setTrendingHashtags] = useState([]);

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

  // Load trending hashtags on mount
  useEffect(() => {
    const fetchTrendingHashtags = async () => {
      try {
        const data = await api.hashtags.trending({ limit: 10 });
        setTrendingHashtags(data || []);
      } catch (error) {
        console.error('Error fetching trending hashtags:', error);
      }
    };
    fetchTrendingHashtags();
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
      setHashtagResults([]);
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
        } else if (activeTab === 'hashtags') {
          const data = await api.search.searchHashtags(debouncedQuery);
          setHashtagResults(data || []);
        }
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

    navigate(`/users/${userId}`);
  };

  const handleThreadClick = (threadId) => {
    navigate(`/posts/${threadId}`);
  };

  const handleHashtagClick = (tag) => {
    setActiveTab('threads');
    setSearchQuery(`#${tag}`);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const tabs = [
    { id: 'users', label: 'Users', icon: User },
    { id: 'threads', label: 'Threads', icon: FileText },
    { id: 'hashtags', label: 'Hashtags', icon: Hash }
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
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
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
                  ? 'bg-indigo-600 text-white shadow-md'
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

        {/* Trending Hashtags (Empty State) */}
        {!searchQuery && activeTab === 'hashtags' && trendingHashtags.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-gray-100">
              <TrendingUp size={20} />
              <h3 className="text-lg font-bold">Trending Hashtags</h3>
            </div>
            <div className="flex flex-col gap-2">
              {trendingHashtags.map(hashtag => (
                <div
                  key={hashtag.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group"
                  onClick={() => handleHashtagClick(hashtag.tag)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      <Hash size={18} />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">#{hashtag.tag}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{hashtag.useCount} posts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Searches (Empty State) */}
        {!searchQuery && recentSearches.length > 0 && activeTab === 'users' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
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
                    src={user.profile?.photoUrl || '/default-avatar.png'}
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
                <div
                  key={thread.id}
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
                  onClick={() => handleThreadClick(thread.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={thread.user.profile?.photoUrl || '/default-avatar.png'}
                      alt={thread.user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <span className="block font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {thread.user.profile?.firstName} {thread.user.profile?.lastName}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">@{thread.user.username}</span>
                    </div>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 mb-3 text-sm leading-relaxed line-clamp-3">{thread.content}</p>
                  <div className="flex gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span>{thread.likesCount} likes</span>
                    <span>{thread.commentsCount} comments</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Hashtag Results */}
        {!isSearching && searchQuery && activeTab === 'hashtags' && (
          <div className="flex flex-col gap-2">
            {hashtagResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <Hash size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                <p>No hashtags found for "{searchQuery}"</p>
              </div>
            ) : (
              hashtagResults.map(hashtag => (
                <div
                  key={hashtag.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors group"
                  onClick={() => handleHashtagClick(hashtag.tag)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      <Hash size={18} />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">#{hashtag.tag}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{hashtag.useCount} posts</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchView;