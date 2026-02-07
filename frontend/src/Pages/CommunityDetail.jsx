import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communitiesAPI, threadsAPI, reactionsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from '../componants/layout/Sidebar';
import MobileNav from '../componants/layout/MobileNav';
import PostCard from '../componants/feed/PostCard';
import CreatePostView from '../componants/feed/CreatePostView';
import { Loader2, ArrowLeft, Settings, Users, Pin, Crown, Shield, Plus, Camera, UserMinus, Ban, MoreVertical } from 'lucide-react';
import api, { getMediaUrl } from '../api/apiClient';
import { Toaster, toast } from 'sonner'
import QUERY_KEYS from '../constants/queryKeys';

// Constants
const THREADS_PER_PAGE = 20;
const MEMBERS_PER_PAGE = 20;

export default function CommunityDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const queryClient = useQueryClient();
    const [showMembers, setShowMembers] = useState(false);
    const [activeMembersTab, setActiveMembersTab] = useState('active');
    const [showCreatePost, setShowCreatePost] = useState(false);
    const [threadsPage, setThreadsPage] = useState(1);
    const bannerInputRef = React.useRef(null);



    // Fetch community details
    const { data: community, isLoading: communityLoading } = useQuery({
        queryKey: QUERY_KEYS.community(id),
        queryFn: () => communitiesAPI.getById(id),
    });

    // Fetch community threads with pagination
    const { data: threadsData, isLoading: threadsLoading, error: threadsError } = useQuery({
        queryKey: QUERY_KEYS.communityThreads(id, threadsPage),
        queryFn: () => communitiesAPI.getThreads(id, { page: threadsPage, limit: THREADS_PER_PAGE }),
        enabled: !!community,
    });

    // Fetch members
    const { data: membersData } = useQuery({
        queryKey: QUERY_KEYS.communityMembers(id),
        queryFn: () => communitiesAPI.getMembers(id),
        enabled: showMembers,
    });

    const { data: bannedData, isLoading: bannedLoading } = useQuery({
        queryKey: ['community', id, 'members', 'banned'],
        queryFn: () => communitiesAPI.getMembers(id, { status: 'BANNED' }),
        enabled: showMembers && activeMembersTab === 'banned',
    });



    // Fetch notifications for sidebar
    const { data: unreadData } = useQuery({
        queryKey: QUERY_KEYS.notificationsUnreadCount,
        queryFn: () => api.notifications.getUnreadCount(),
        enabled: !!user,
    });

    // Join/Leave mutations
    const joinMutation = useMutation({
        mutationFn: () => communitiesAPI.join(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community', id] });
            queryClient.invalidateQueries({ queryKey: ['my-communities'] });
            toast.success(`You have joined ${community.name}`);
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to join community';
            toast.error(message);
        }
    });

    const leaveMutation = useMutation({
        mutationFn: () => communitiesAPI.leave(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community', id] });
            queryClient.invalidateQueries({ queryKey: ['my-communities'] });
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to leave community';
            toast.error(message);
        }
    });

    // Pin mutation
    const pinMutation = useMutation({
        mutationFn: (threadId) => communitiesAPI.togglePin(id, threadId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community-threads', id] });
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to pin/unpin thread';
            toast.error(message);
        }
    });

    // Create post mutation with optimistic updates
    const createPostMutation = useMutation({
        mutationFn: (formData) => {
            formData.append('communityId', id);
            return threadsAPI.create(formData);
        },
        // Optimistic update: immediately add post to cache
        onMutate: async (formData) => {
            // Cancel any outgoing refetches to avoid overwriting optimistic update
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.communityThreads(id, threadsPage) });

            // Snapshot the previous value for rollback
            const previousThreads = queryClient.getQueryData(QUERY_KEYS.communityThreads(id, threadsPage));

            // Optimistically update cache with temporary post
            queryClient.setQueryData(QUERY_KEYS.communityThreads(id, threadsPage), (old) => {
                if (!old) return old;

                // Create optimistic post object
                const optimisticPost = {
                    id: `temp-${Date.now()}`, // Temporary ID
                    content: formData.get('content') || '',
                    userId: user.id,
                    user: {
                        id: user.id,
                        username: user.username,
                        profile: user.profile || {},
                    },
                    communityId: parseInt(id),
                    createdAt: new Date().toISOString(),
                    likesCount: 0,
                    commentsCount: 0,
                    repostsCount: 0,
                    isLiked: false,
                    isPinned: false,
                    media: [], // Media will be added after server response
                    _optimistic: true, // Flag to identify optimistic updates
                };

                return {
                    ...old,
                    data: [optimisticPost, ...(old.data || [])],
                };
            });

            // Return context with snapshot for rollback
            return { previousThreads };
        },
        onSuccess: (newThread) => {
            // Replace optimistic post with real server data
            queryClient.setQueryData(QUERY_KEYS.communityThreads(id, threadsPage), (old) => {
                if (!old) return old;

                return {
                    ...old,
                    data: old.data.map(thread =>
                        thread._optimistic ? newThread : thread
                    ),
                };
            });

            // Refetch to ensure sync with database
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.communityThreads(id, threadsPage) });

            setShowCreatePost(false);
            toast.success('Post created successfully');
        },
        onError: (error, variables, context) => {
            // Rollback to previous state on error
            if (context?.previousThreads) {
                queryClient.setQueryData(
                    QUERY_KEYS.communityThreads(id, threadsPage),
                    context.previousThreads
                );
            }

            const message = error.response?.data?.message || 'Failed to create post';
            toast.error(message);
        },
    });

    // Upload banner mutation
    const uploadBannerMutation = useMutation({
        mutationFn: (file) => communitiesAPI.uploadBanner(id, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community', id] });
            toast.success('Banner uploaded successfully');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Failed to upload banner';
            toast.error(message);
        }
    });

    const repostMutation = useMutation({
        mutationFn: (post) => threadsAPI.repost(post.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.communityThreads(id, threadsPage) });
            toast.success('Post reposted successfully');
        },
    });

    // Delete mutation with optimistic update
    const deleteMutation = useMutation({
        mutationFn: (threadId) => threadsAPI.delete(threadId),
        onMutate: async (threadId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.communityThreads(id, threadsPage) });

            // Snapshot previous value
            const previousThreads = queryClient.getQueryData(QUERY_KEYS.communityThreads(id, threadsPage));

            // Optimistically remove from cache
            queryClient.setQueryData(QUERY_KEYS.communityThreads(id, threadsPage), (old) => {
                if (!old) return old;
                return {
                    ...old,
                    data: old.data.filter(thread => thread.id !== threadId),
                };
            });

            return { previousThreads };
        },
        onSuccess: () => {
            toast.success('Post deleted successfully');
            // Refetch to sync with DB
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.communityThreads(id, threadsPage) });
        },
        onError: (error, threadId, context) => {
            // Rollback on error
            if (context?.previousThreads) {
                queryClient.setQueryData(
                    QUERY_KEYS.communityThreads(id, threadsPage),
                    context.previousThreads
                );
            }
            toast.error('Failed to delete post');
        },
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, role }) => communitiesAPI.updateRole(id, userId, role),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.communityMembers(id) });
            queryClient.invalidateQueries({ queryKey: ['community', id] });
            toast.success(`Member role updated to ${variables.role}`);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update member role');
        }
    });

    const kickMutation = useMutation({
        mutationFn: (userId) => communitiesAPI.kick(id, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.communityMembers(id) });
            queryClient.invalidateQueries({ queryKey: ['community', id] });
            toast.success('Member kicked successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to kick member');
        }
    });

    const banMutation = useMutation({
        mutationFn: (userId) => communitiesAPI.ban(id, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.communityMembers(id) });
            queryClient.invalidateQueries({ queryKey: ['community', id] });
            queryClient.invalidateQueries({ queryKey: ['community', id, 'members', 'banned'] });
            toast.success('Member banned successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to ban member');
        }
    });

    const unbanMutation = useMutation({
        mutationFn: (userId) => communitiesAPI.unban(id, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.communityMembers(id) }); // Update member count/list if applicable
            queryClient.invalidateQueries({ queryKey: ['community', id, 'members', 'banned'] });
            toast.success('Member unbanned successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to unban member');
        }
    });

    const handleRoleChange = (userId, newRole) => {
        updateRoleMutation.mutate({ userId, role: newRole });
    };

    const handleKick = (userId) => {
        if (confirm('Are you sure you want to kick this member?')) {
            kickMutation.mutate(userId);
        }
    };

    const handleBan = (userId) => {
        if (confirm('Are you sure you want to ban this member?')) {
            banMutation.mutate(userId);
        }
    };

    const handleUnban = (userId) => {
        if (confirm('Are you sure you want to unban this member?')) {
            unbanMutation.mutate(userId);
        }
    };

    // Like mutation with optimistic update
    const likeMutation = useMutation({
        mutationFn: (threadId) => reactionsAPI.toggle('thread', threadId),
        onMutate: async (threadId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.communityThreads(id, threadsPage) });

            // Snapshot previous value
            const previousThreads = queryClient.getQueryData(QUERY_KEYS.communityThreads(id, threadsPage));

            // Optimistically update like status
            queryClient.setQueryData(QUERY_KEYS.communityThreads(id, threadsPage), (old) => {
                if (!old) return old;
                return {
                    ...old,
                    data: old.data.map(thread => {
                        if (thread.id === threadId) {
                            const isCurrentlyLiked = thread.isLiked;
                            return {
                                ...thread,
                                isLiked: !isCurrentlyLiked,
                                likesCount: isCurrentlyLiked
                                    ? thread.likesCount - 1
                                    : thread.likesCount + 1,
                            };
                        }
                        return thread;
                    }),
                };
            });

            return { previousThreads };
        },
        onError: (error, threadId, context) => {
            // Rollback on error
            if (context?.previousThreads) {
                queryClient.setQueryData(
                    QUERY_KEYS.communityThreads(id, threadsPage),
                    context.previousThreads
                );
            }
        },
        onSettled: () => {
            // Refetch to ensure sync with DB (silent, in background)
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.communityThreads(id, threadsPage) });
        },
    });

    const handleLike = (post) => {
        likeMutation.mutate(post.id)
    }

    const handleBannerUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadBannerMutation.mutate(file);
        }
    };

    const handleRepost = (post) => {
        repostMutation.mutate(post);
    };

    const unreadNotifications = unreadData?.count || 0;
    const threads = threadsData || [];
    const members = membersData || [];
    const bannedMembers = bannedData || [];
    const isMember = community?.isMember;
    const isAdmin = community?.isAdmin;
    const isModerator = community?.isModerator;
    const userRole = community?.role; // 'ADMIN', 'MODERATOR', or 'MEMBER'
    const isCreator = community?.creatorId === user?.id;
    const canModerate = isAdmin || isModerator; // Can pin/delete/kick/ban
    const canManageRoles = isAdmin; // Only admins can change roles



    if (communityLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!community) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="text-center">
                    <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        Community not found
                    </h2>
                    <button onClick={() => navigate('/communities')} className="text-indigo-600 hover:underline">
                        Back to Communities
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50/50'}`}>
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:block border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
                }`}>
                <Sidebar
                    activeTab="communities"
                    setActiveTab={() => { }}
                    unreadNotifications={unreadNotifications}
                    user={user}
                />
            </aside>

            {/* Main Content */}
            <div className="lg:pl-72">
                <main className="pb-24 lg:pb-8 max-w-3xl mx-auto">
                    {/* Header */}
                    <div className={`sticky top-0 z-10 px-4 py-3 border-b ${isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-100'
                        } backdrop-blur-sm`}>
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate('/communities')} className="p-2 hover:bg-gray-100 rounded-full">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className={`font-bold text-lg ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                    {community.name}
                                </h1>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {community.membersCount || community._count?.members || 0} members
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Community Banner */}
                    <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600 group">
                        {community.photoUrl ? (
                            <img
                                src={getMediaUrl(community.photoUrl)}
                                alt="Community banner"
                                className="w-full h-full object-cover"
                            />
                        ) : null}
                        {uploadBannerMutation.isPending && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            </div>
                        )}
                        {isAdmin && (
                            <>
                                <input
                                    ref={bannerInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleBannerUpload}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => bannerInputRef.current?.click()}
                                    className="absolute bottom-3 right-3 p-2 bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
                                    title="Upload banner"
                                    disabled={uploadBannerMutation.isPending}
                                >
                                    <Camera className="w-5 h-5" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Community Info */}
                    <div className={`px-4 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                    {community.name}
                                </h2>
                                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {community.description || 'No description'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {isAdmin && (
                                    <button
                                        onClick={() => setShowMembers(!showMembers)}
                                        className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                        title="Manage members"
                                    >
                                        <Users className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => isMember ? leaveMutation.mutate() : joinMutation.mutate()}
                                    disabled={joinMutation.isPending || leaveMutation.isPending}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${isMember
                                        ? isDarkMode
                                            ? 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-red-100 hover:text-red-600'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                        } ${(joinMutation.isPending || leaveMutation.isPending) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Toaster />
                                    {(joinMutation.isPending || leaveMutation.isPending) && (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    )}
                                    {joinMutation.isPending ? 'Joining...' : leaveMutation.isPending ? 'Leaving...' : isMember ? 'Leave' : 'Join'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Members Panel */}
                    {showMembers && (
                        <div className={`px-4 py-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                    {activeMembersTab === 'active' ? `Members (${members.length})` : `Banned Users (${bannedMembers.length})`}
                                </h3>
                                {canModerate && (
                                    <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1 text-xs font-medium">
                                        <button
                                            onClick={() => setActiveMembersTab('active')}
                                            className={`px-3 py-1 rounded-md transition-all ${activeMembersTab === 'active'
                                                ? 'bg-white dark:bg-gray-600 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                }`}
                                        >
                                            Active
                                        </button>
                                        <button
                                            onClick={() => setActiveMembersTab('banned')}
                                            className={`px-3 py-1 rounded-md transition-all ${activeMembersTab === 'banned'
                                                ? 'bg-white dark:bg-gray-600 shadow-sm text-red-500'
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                                }`}
                                        >
                                            Banned
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {activeMembersTab === 'active' ? (
                                    members.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-gray-500">No members found</div>
                                    ) : (
                                        members.map((member) => {
                                            const fullName = member.profile?.firstName && member.profile?.lastName
                                                ? `${member.profile.firstName} ${member.profile.lastName}`
                                                : member.username;
                                            const avatarLetter = member.profile?.firstName?.[0] || member.username?.[0] || '?';

                                            return (
                                                <div key={member.id} className="flex items-center justify-between py-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden">
                                                            {member.profile?.photoUrl ? (
                                                                <img src={getMediaUrl(member.profile.photoUrl)} alt={fullName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                avatarLetter.toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                {fullName}
                                                            </span>
                                                            {member.profile?.firstName && (
                                                                <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                                    @{member.username}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-1 text-xs">
                                                                {member.role === 'ADMIN' && (
                                                                    <span className="text-amber-500 flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                                                                        {member.isCreator ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                                                        Admin
                                                                    </span>
                                                                )}
                                                                {member.role === 'MODERATOR' && (
                                                                    <span className="text-indigo-500 flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100">
                                                                        <Shield className="w-3 h-3" />
                                                                        Mod
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Member Actions */}
                                                    <div className="flex items-center gap-2">
                                                        {canManageRoles && !member.isCreator && member.id !== user.id && (
                                                            <select
                                                                value={member.role}
                                                                onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                                className={`text-xs p-1 rounded border min-w-[90px] ${isDarkMode
                                                                    ? 'bg-gray-700 border-gray-600 text-gray-200'
                                                                    : 'bg-white border-gray-200 text-gray-800'}`}
                                                            >
                                                                <option value="MEMBER">Member</option>
                                                                <option value="MODERATOR">Moderator</option>
                                                                <option value="ADMIN">Admin</option>
                                                            </select>
                                                        )}

                                                        {(canModerate && member.id !== user.id && !member.isCreator && (isAdmin || member.role === 'MEMBER')) && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleKick(member.id)}
                                                                    className={`p-1.5 rounded-full transition-colors ${isDarkMode
                                                                        ? 'text-red-400 hover:bg-gray-700'
                                                                        : 'text-red-500 hover:bg-red-50'}`}
                                                                    title="Kick member"
                                                                >
                                                                    <UserMinus className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleBan(member.id)}
                                                                    className={`p-1.5 rounded-full transition-colors ${isDarkMode
                                                                        ? 'text-red-400 hover:bg-gray-700'
                                                                        : 'text-red-600 hover:bg-red-50'}`}
                                                                    title="Ban member"
                                                                >
                                                                    <Ban className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )
                                ) : (
                                    // Banned Users List
                                    (bannedLoading ? (
                                        <div className="flex justify-center py-4"><Loader2 className="animate-spin w-5 h-5" /></div>
                                    ) : bannedMembers.length === 0 ? (
                                        <div className="text-center py-4 text-sm text-gray-500">No banned users</div>
                                    ) : (
                                        bannedMembers.map((member) => {
                                            const fullName = member.profile?.firstName && member.profile?.lastName
                                                ? `${member.profile.firstName} ${member.profile.lastName}`
                                                : member.username;
                                            const avatarLetter = member.profile?.firstName?.[0] || member.username?.[0] || '?';

                                            return (
                                                <div key={member.id} className="flex items-center justify-between py-2 opacity-75">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-bold overflow-hidden">
                                                            {member.profile?.photoUrl ? (
                                                                <img src={getMediaUrl(member.profile.photoUrl)} alt={fullName} className="w-full h-full object-cover grayscale" />
                                                            ) : (
                                                                avatarLetter.toUpperCase()
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className={`font-medium line-through ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                                {fullName}
                                                            </span>
                                                            <div className={`text-xs ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                                                @{member.username} • Banned
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnban(member.id)}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${isDarkMode
                                                            ? 'bg-gray-700 text-gray-300 hover:bg-green-900/30 hover:text-green-400'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'}`}
                                                    >
                                                        Unban
                                                    </button>
                                                </div>
                                            );
                                        })
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Create Post Section */}
                    {isMember && (
                        <div className={`px-4 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                            {!showCreatePost ? (
                                <button
                                    onClick={() => setShowCreatePost(true)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed transition-all ${isDarkMode
                                        ? 'border-gray-700 hover:border-indigo-500 hover:bg-gray-800/50'
                                        : 'border-gray-200 hover:border-indigo-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                        <Plus className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <div className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            Share something with {community.name}
                                        </div>
                                        <div className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Create a post in this community
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <div className="bg-white dark:bg-gray-800 rounded-2xl">
                                    <CreatePostView
                                        onBack={() => setShowCreatePost(false)}
                                        onPost={(formData) => createPostMutation.mutate(formData)}
                                        user={user}
                                        isLoading={createPostMutation.isPending}
                                        error={createPostMutation.error?.response?.data?.message}
                                        communityName={community.name}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Threads */}
                    <div className="p-4">
                        <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                            Posts
                        </h3>
                        {threadsLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                            </div>
                        ) : threadsError ? (
                            <div className={`text-center py-8 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                <p>Error loading posts: {threadsError.message}</p>
                                <p className="text-sm mt-2">{threadsError.response?.data?.message || 'Please try again'}</p>
                            </div>
                        ) : threads.length === 0 ? (
                            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                No posts in this community yet.
                                {isMember && <p className="mt-2">Be the first to post!</p>}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {threads.map((thread) => (
                                    <div key={thread.id} className="relative">
                                        {thread.isPinned && (
                                            <div className="absolute -top-2 left-4 z-10 flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                                                <Pin className="w-3 h-3" />
                                                Pinned
                                            </div>
                                        )}
                                        <PostCard
                                            post={thread}
                                            showActions={true}
                                            onClick={() => navigate(`/thread/${thread.id}`)}
                                            onShare={handleRepost}
                                            onLike={handleLike}
                                            onDelete={deleteMutation.mutate}
                                            canComment={isMember}
                                            isOwnPost={thread.userId === user.id}
                                        />
                                        {canModerate && (
                                            <button
                                                onClick={() => pinMutation.mutate(thread.id)}
                                                className={`absolute top-2 right-2 p-1.5 rounded-full text-xs ${thread.isPinned
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                                                    }`}
                                                title={thread.isPinned ? 'Unpin' : 'Pin'}
                                            >
                                                <Pin className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Pagination Controls */}
                                {threadsData?.pagination && (
                                    <div className={`flex items-center justify-between pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <button
                                            onClick={() => setThreadsPage(p => Math.max(1, p - 1))}
                                            disabled={threadsPage === 1}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${threadsPage === 1
                                                ? 'opacity-50 cursor-not-allowed'
                                                : isDarkMode
                                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Previous
                                        </button>
                                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Page {threadsPage} of {threadsData.pagination.totalPages || 1}
                                        </span>
                                        <button
                                            onClick={() => setThreadsPage(p => p + 1)}
                                            disabled={!threadsData.pagination.hasMore}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${!threadsData.pagination.hasMore
                                                ? 'opacity-50 cursor-not-allowed'
                                                : isDarkMode
                                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Mobile Navigation */}
            <MobileNav
                activeTab="communities"
                setActiveTab={() => { }}
                unreadNotifications={unreadNotifications}
            />
        </div>
    );
}
