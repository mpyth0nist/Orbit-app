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
import { Loader2, ArrowLeft, Settings, Users, Pin, Crown, Shield, Plus, Camera } from 'lucide-react';
import api, { getMediaUrl } from '../api/apiClient';
import { toast } from 'sonner'

export default function CommunityDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const queryClient = useQueryClient();
    const [showMembers, setShowMembers] = useState(false);
    const [showCreatePost, setShowCreatePost] = useState(false);
    const bannerInputRef = React.useRef(null);

    // Fetch community details
    const { data: community, isLoading: communityLoading } = useQuery({
        queryKey: ['community', id],
        queryFn: () => communitiesAPI.getById(id),
    });

    // Fetch community threads
    const { data: threadsData, isLoading: threadsLoading, error: threadsError } = useQuery({
        queryKey: ['community-threads', id],
        queryFn: () => communitiesAPI.getThreads(id),
        enabled: !!community,
    });

    // Fetch members
    const { data: membersData } = useQuery({
        queryKey: ['community-members', id],
        queryFn: () => communitiesAPI.getMembers(id),
        enabled: showMembers,
    });

    // Fetch notifications for sidebar
    const { data: unreadData } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: () => api.notifications.getUnreadCount(),
        enabled: !!user,
    });

    // Join/Leave mutations
    const joinMutation = useMutation({
        mutationFn: () => communitiesAPI.join(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community', id] });
            queryClient.invalidateQueries({ queryKey: ['my-communities'] });
        },
    });

    const leaveMutation = useMutation({
        mutationFn: () => communitiesAPI.leave(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community', id] });
            queryClient.invalidateQueries({ queryKey: ['my-communities'] });
        },
    });

    // Pin mutation
    const pinMutation = useMutation({
        mutationFn: (threadId) => communitiesAPI.togglePin(id, threadId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community-threads', id] });
        },
    });

    // Create post mutation
    const createPostMutation = useMutation({
        mutationFn: (formData) => {
            formData.append('communityId', id);
            console.log("communityId", id)
            return threadsAPI.create(formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community-threads', id] });
            setShowCreatePost(false);
        },
    });

    // Upload banner mutation
    const uploadBannerMutation = useMutation({
        mutationFn: (file) => communitiesAPI.uploadBanner(id, file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community', id] });
        },
    });

    const repostMutation = useMutation({
        mutationFn: (post) => threadsAPI.repost(post.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community-threads', id] });
            toast.success('Post reposted successfully');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (threadId) => threadsAPI.delete(threadId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community-threads', id] });
            toast.success('Post deleted successfully');
        },
    });

    const likeMutation = useMutation({
        mutationFn: (threadId) => reactionsAPI.toggle('thread', threadId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community-threads', id] });
            // toast.success('Post liked successfully'); // Removed toast to act like Twitter/social apps (silent like)
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
    const isMember = community?.isMember;
    const isAdmin = community?.isAdmin;
    const isCreator = community?.creatorId === user?.id;

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
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${isMember
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

                    {/* Members Panel */}
                    {showMembers && (
                        <div className={`px-4 py-4 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
                            <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                Members ({members.length})
                            </h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {members.map((member) => {
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
                                                            <span className="text-amber-500 flex items-center gap-1">
                                                                {member.isCreator ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                                                {member.role}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                                        />
                                        {isAdmin && (
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
