import React, { useState, useEffect } from 'react';
import { CogIcon, CheckBadgeIcon, CameraIcon } from '../ui/Icons';
import * as base44 from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function ProfileView({ user, onEditProfile, onSettingsClick }) {
  const [userPosts, setUserPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts');

  useEffect(() => {
    loadUserPosts();
  }, [user?.email]);

  const loadUserPosts = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      const posts = await base44.entities.Post.filter({ created_by: user.email }, '-created_date');
      setUserPosts(posts || []);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    posts: userPosts.length,
    followers: user?.followers_count || 1247,
    following: user?.following_count || 524,
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Cover Image */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <button className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-full hover:bg-black/50 transition-colors">
          <CameraIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Info */}
      <div className="relative px-6 pb-6">
        {/* Avatar */}
        <div className="absolute -top-16 left-6">
          <div className="relative">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff&size=128`}
              alt={user?.full_name}
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
            />
            <button 
              onClick={onEditProfile}
              className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-lg"
            >
              <CameraIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 gap-2">
          <button
            onClick={onSettingsClick}
            className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <CogIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onEditProfile}
            className="px-5 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Edit Profile
          </button>
        </div>

        {/* Name & Bio */}
        <div className="mt-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{user?.full_name || 'User'}</h1>
            {user?.verified && <CheckBadgeIcon className="w-6 h-6 text-indigo-500" />}
          </div>
          <p className="text-gray-500 mt-0.5">@{user?.handle || user?.email?.split('@')[0]}</p>
          <p className="text-gray-700 mt-3 leading-relaxed">
            {user?.bio || '✨ Digital creator & tech enthusiast\n🌍 Exploring the world one pixel at a time\n💡 Building amazing things'}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-8 mt-6 py-4 border-y border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.posts}</p>
            <p className="text-sm text-gray-500">Posts</p>
          </div>
          <div className="text-center cursor-pointer hover:opacity-70 transition-opacity">
            <p className="text-2xl font-bold text-gray-900">{stats.followers.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Followers</p>
          </div>
          <div className="text-center cursor-pointer hover:opacity-70 transition-opacity">
            <p className="text-2xl font-bold text-gray-900">{stats.following.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Following</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mt-4 border-b border-gray-100">
          {['posts', 'media', 'likes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors relative ${
                activeTab === tab ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content Grid */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CameraIcon className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {userPosts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-indigo-100 to-purple-100">
                      <p className="text-xs text-gray-600 line-clamp-4 text-center">{post.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}