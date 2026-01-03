import React, { useState, useEffect } from 'react';
import { SearchIcon, TrendingUpIcon, FireIcon, XMarkIcon } from '../ui/Icons';
import * as base44  from '@/api/base44Client';
import PostCard from '../feed/PostCard';
import { Loader2 } from 'lucide-react';

export default function SearchView({ onPostClick, onLike, currentUserEmail }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState(['React', 'Design', 'AI', 'Startups']);

  const trendingTopics = [
    { tag: '#TechNews', posts: '24.5K', trend: '+15%' },
    { tag: '#AIart', posts: '18.2K', trend: '+32%' },
    { tag: '#WebDev', posts: '12.8K', trend: '+8%' },
    { tag: '#Startups', posts: '9.4K', trend: '+22%' },
    { tag: '#Design', posts: '7.1K', trend: '+5%' },
  ];

  const suggestedUsers = [
    { name: 'Sarah Chen', handle: 'sarahchen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', followers: '12.5K' },
    { name: 'Alex Rivera', handle: 'alexr', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', followers: '8.2K' },
    { name: 'Maya Patel', handle: 'mayap', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', followers: '15.8K' },
  ];

  const handleSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const posts = await base44.entities.Post.list('-created_date', 50);
      const filtered = posts.filter(post => 
        post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author_handle?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
      
      // Add to recent searches
      if (!recentSearches.includes(searchQuery)) {
        setRecentSearches([searchQuery, ...recentSearches.slice(0, 3)]);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query) handleSearch(query);
    }, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts, people, or topics..."
          className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all"
          autoFocus
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSearchResults([]);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {query && (
        <div className="mb-6">
          {isSearching ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Results for "{query}"
              </h3>
              {searchResults.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserEmail={currentUserEmail}
                  onClick={() => onPostClick?.(post)}
                  onLike={onLike}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No results found for "{query}"</p>
            </div>
          )}
        </div>
      )}

      {/* Default Content */}
      {!query && (
        <>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Recent</h2>
                <button 
                  onClick={() => setRecentSearches([])}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(search)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Topics */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <FireIcon className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-gray-900">Trending Topics</h2>
            </div>
            <div className="space-y-4">
              {trendingTopics.map((topic, i) => (
                <div
                  key={topic.tag}
                  onClick={() => setQuery(topic.tag)}
                  className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-400">{i + 1}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{topic.tag}</p>
                      <p className="text-sm text-gray-500">{topic.posts} posts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                    <TrendingUpIcon className="w-4 h-4" />
                    {topic.trend}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Users */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Who to Follow</h2>
            <div className="space-y-4">
              {suggestedUsers.map((user) => (
                <div key={user.handle} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">@{user.handle} · {user.followers} followers</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition-colors">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}