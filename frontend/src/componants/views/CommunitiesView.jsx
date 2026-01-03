import React, { useState, useEffect } from 'react';
import { SearchIcon, UsersIcon, CheckBadgeIcon } from '../ui/Icons';
import * as base44 from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function CommunitiesView({ currentUserEmail }) {
  const [communities, setCommunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = ['all', 'Technology', 'Design', 'Gaming', 'Music', 'Sports', 'Art'];

  useEffect(() => {
    loadCommunities();
  }, []);

  const loadCommunities = async () => {
    setIsLoading(true);
    try {
      const data = await base44.entities.Community.list('-members_count', 50);
      
      if (!data?.length) {
        // Sample communities
        setCommunities([
          { id: '1', name: 'Tech Innovators', description: 'Discuss the latest in technology and innovation', cover_image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400', icon: '🚀', members_count: 12500, category: 'Technology', member_emails: [] },
          { id: '2', name: 'Design Masters', description: 'A community for UI/UX designers and creatives', cover_image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400', icon: '🎨', members_count: 8400, category: 'Design', member_emails: [] },
          { id: '3', name: 'Gaming Zone', description: 'Connect with gamers worldwide', cover_image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400', icon: '🎮', members_count: 25600, category: 'Gaming', member_emails: [] },
          { id: '4', name: 'Music Lovers', description: 'Share and discover new music', cover_image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400', icon: '🎵', members_count: 15200, category: 'Music', member_emails: [] },
          { id: '5', name: 'Fitness & Health', description: 'Tips, motivation, and workout routines', cover_image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', icon: '💪', members_count: 9800, category: 'Sports', member_emails: [] },
          { id: '6', name: 'Art Gallery', description: 'Showcase your artwork and get inspired', cover_image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400', icon: '🖼️', members_count: 6700, category: 'Art', member_emails: [] },
        ]);
      } else {
        setCommunities(data);
      }
    } catch (error) {
      console.error('Failed to load communities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (communityId) => {
    setCommunities(communities.map(c => {
      if (c.id === communityId) {
        const isMember = c.member_emails?.includes(currentUserEmail);
        return {
          ...c,
          members_count: isMember ? c.members_count - 1 : c.members_count + 1,
          member_emails: isMember 
            ? c.member_emails.filter(e => e !== currentUserEmail)
            : [...(c.member_emails || []), currentUserEmail]
        };
      }
      return c;
    }));
  };

  const filteredCommunities = communities.filter(c => {
    const matchesSearch = !searchQuery || 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Communities</h1>
        <p className="text-gray-500">Discover and join communities that interest you</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search communities..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${
              activeCategory === category
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Communities Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredCommunities.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UsersIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No communities found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCommunities.map((community) => {
            const isMember = community.member_emails?.includes(currentUserEmail);
            
            return (
              <div
                key={community.id}
                className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all"
              >
                {/* Cover */}
                <div className="relative h-32">
                  <img
                    src={community.cover_image || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400'}
                    alt={community.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-lg">
                      {community.icon || '🌟'}
                    </div>
                    <div className="text-white">
                      <div className="flex items-center gap-1">
                        <h3 className="font-bold">{community.name}</h3>
                        <CheckBadgeIcon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <p className="text-xs text-white/80">{community.members_count?.toLocaleString()} members</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {community.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {community.category}
                    </span>
                    <button
                      onClick={() => handleJoin(community.id)}
                      className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                        isMember
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
                      }`}
                    >
                      {isMember ? 'Joined' : 'Join'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}