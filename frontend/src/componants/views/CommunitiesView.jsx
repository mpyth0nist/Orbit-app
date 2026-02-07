import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SearchIcon, UsersIcon } from '../ui/Icons';
import { communitiesAPI } from '../../api/apiClient';
import { Loader2, X, Plus } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getMediaUrl } from '../../api/apiClient';

export default function CommunitiesView({ currentUserId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { t } = useLanguage();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch communities
  const { data: communitiesData, isLoading } = useQuery({
    queryKey: ['communities', searchQuery],
    queryFn: () => communitiesAPI.getAll({ search: searchQuery || undefined }),
    staleTime: 30000,
  });

  // Fetch user's communities  
  const { data: myCommunities } = useQuery({
    queryKey: ['my-communities'],
    queryFn: () => communitiesAPI.getMy(),
  });

  const communities = communitiesData || [];
  const myComIds = new Set((myCommunities || []).map(c => c.id));

  // Join mutation
  const joinMutation = useMutation({
    mutationFn: (id) => communitiesAPI.join(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my-communities'] });
      toast.success(`You joined the community`);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to join community';
      console.error('Join error:', message);
      toast.error(message);
    }
  });

  // Leave mutation
  const leaveMutation = useMutation({
    mutationFn: (id) => communitiesAPI.leave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my-communities'] });
      toast.success(`You left the community`);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to leave community';
      console.error('Leave error:', message);
      toast.error(message);
    }
  });

  const handleToggleMembership = (communityId, isMember) => {
    if (isMember) {
      leaveMutation.mutate(communityId);
    } else {
      joinMutation.mutate(communityId);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            {t('communities') || 'Communities'}
          </h1>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
            {t('discoverCommunities') || 'Discover and join communities'}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Create</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search communities..."
          className={`w-full pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode
            ? 'bg-gray-800 text-gray-100 border-gray-700 placeholder-gray-500'
            : 'bg-white text-gray-800 border-gray-200 placeholder-gray-400'
            } border`}
        />
      </div>

      {/* Communities Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : communities.length === 0 ? (
        <div className={`rounded-3xl p-12 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
            <UsersIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          </div>
          <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            No communities yet
          </h3>
          <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Be the first to create one!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700"
          >
            Create Community
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {communities.map((community) => {
            const isMember = myComIds.has(community.id) || community.isMember;

            return (
              <div
                key={community.id}
                className={`rounded-2xl overflow-hidden shadow-sm border hover:shadow-md transition-all cursor-pointer ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                  }`}
                onClick={() => navigate(`/communities/${community.id}`)}
              >
                {/* Cover */}
                <div className="relative h-24 bg-gradient-to-r from-indigo-500 to-purple-600">
                  {community.photoUrl && (
                    <img src={getMediaUrl(community.photoUrl)} alt="" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className={`font-bold text-lg mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {community.name}
                  </h3>
                  <p className={`text-sm mb-3 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {community.description || 'No description'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {community.membersCount || community._count?.members || 0} members
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMembership(community.id, isMember);
                      }}
                      disabled={joinMutation.isPending || leaveMutation.isPending}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isMember
                        ? isDarkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-600'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                    >
                      {isMember ? 'Leave' : 'Join'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCommunityModal
          onClose={() => setShowCreateModal(false)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
}

function CreateCommunityModal({ onClose, isDarkMode }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: (data) => communitiesAPI.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['my-communities'] });
      onClose();
      if (data?.id) {
        navigate(`/communities/${data.id}`);
      }
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to create community');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    createMutation.mutate({ name: name.trim(), description: description.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-2xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
            Create Community
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tech Enthusiasts"
              maxLength={100}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDarkMode
                ? 'bg-gray-700 border-gray-600 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
                }`}
            />
          </div>

          <div className="mb-6">
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this community about?"
              maxLength={500}
              rows={3}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${isDarkMode
                ? 'bg-gray-700 border-gray-600 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
                }`}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2 rounded-lg font-medium ${isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}