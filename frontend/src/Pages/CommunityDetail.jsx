import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communitiesAPI, threadsAPI } from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from '../componants/layout/Sidebar';
import MobileNav from '../componants/layout/MobileNav';
import PostCard from '../componants/feed/PostCard';
import { Loader2, ArrowLeft, Settings, Users, Pin, Crown, Shield } from 'lucide-react';
import api from '../api/apiClient';

export default function CommunityDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const queryClient = useQueryClient();
    const [showMembers, setShowMembers] = useState(false);

    // Fetch community details
    const { data: community, isLoading: communityLoading } = useQuery({
        queryKey: ['community', id],
        queryFn: () => communitiesAPI.getById(id),
    });

    // Fetch community threads
    const { data: threadsData, isLoading: threadsLoading } = useQuery({
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
                    <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600">
                        {community.photoUrl && (
                            <img src={community.photoUrl} alt="" className="w-full h-full object-cover" />
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
                                {members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                                                {member.user?.username?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                    {member.user?.username}
                                                </span>
                                                <div className="flex items-center gap-1 text-xs">
                                                    {member.role === 'ADMIN' && (
                                                        <span className="text-amber-500 flex items-center gap-1">
                                                            {member.userId === community.creatorId ? <Crown className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                                            {member.role}
                                                        </span>
                                                    )}
                                                    {member.status === 'BANNED' && (
                                                        <span className="text-red-500">Banned</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                            onPostClick={() => navigate(`/thread/${thread.id}`)}
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
