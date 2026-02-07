import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { ArrowLeftIcon, CheckBadgeIcon, UserIcon, LockClosedIcon, CameraIcon, ImageIcon, HeartIcon } from '../ui/Icons';
import TierBadge from '../ui/TierBadge';
import FollowersModal from '../ui/FollowersModal';
import PostCard from '../feed/PostCard';
import api, { getMediaUrl } from '../../api/apiClient';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * UserProfileView - View another user's profile
 * Shows public info, followers/following counts, posts, and media based on privacy settings
 */
export default function UserProfileView({
    userId,
    onBack,
    onPostClick,
    currentUserId
}) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [relationship, setRelationship] = useState(null);
    // threads state managed by useInfiniteQuery now
    const [isLoading, setIsLoading] = useState(true);
    // isLoadingThreads replaced by isThreadsLoading from useInfiniteQuery
    const [isFollowLoading, setIsFollowLoading] = useState(false);
    const [error, setError] = useState(null);
    const [canViewContent, setCanViewContent] = useState(false);

    // Modal state
    const [modalType, setModalType] = useState(null); // 'followers' or 'following'
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState('posts');
    const [mediaItems, setMediaItems] = useState([]);
    const [isLoadingTab, setIsLoadingTab] = useState(false);

    const { t } = useLanguage();
    const { isDarkMode } = useTheme();
    const queryClient = useQueryClient();

    // Like mutation with optimistic updates
    const likeMutation = useMutation({
        mutationFn: (post) => api.reactions.toggle('thread', post.id),
        onMutate: async (postToLike) => {
            await queryClient.cancelQueries({ queryKey: ['userThreads', userId] });
            const previousData = queryClient.getQueryData(['userThreads', userId]);

            queryClient.setQueryData(['userThreads', userId], (oldData) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => {
                        const isArray = Array.isArray(page);
                        const data = isArray ? page : page.data;
                        const updatedData = data.map(p =>
                            p.id === postToLike.id
                                ? { ...p, isLiked: !p.isLiked, likesCount: p.isLiked ? (p.likesCount || 1) - 1 : (p.likesCount || 0) + 1 }
                                : p
                        );
                        return isArray ? updatedData : { ...page, data: updatedData };
                    })
                };
            });
            return { previousData };
        },
        onError: (err, postToLike, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['userThreads', userId], context.previousData);
            }
        },
    });

    // Repost mutation
    const repostMutation = useMutation({
        mutationFn: (post) => api.threads.repost(post.id),
        onSuccess: () => {
            // Refresh threads and stats
            queryClient.invalidateQueries({ queryKey: ['userThreads', userId] });
            fetchUserData(); // To refresh stats
        },
    });

    const handleRepost = (post) => {
        repostMutation.mutate(post);
    };

    // Bookmark mutation
    const bookmarkMutation = useMutation({
        mutationFn: (post) => api.threads.toggleSave(post.id),
        onMutate: async (postToBookmark) => {
            await queryClient.cancelQueries({ queryKey: ['userThreads', userId] });
            const previousData = queryClient.getQueryData(['userThreads', userId]);

            queryClient.setQueryData(['userThreads', userId], (oldData) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page) => {
                        const isArray = Array.isArray(page);
                        const data = isArray ? page : page.data;
                        const updatedData = data.map(p =>
                            p.id === postToBookmark.id
                                ? { ...p, isSaved: !p.isSaved }
                                : p
                        );
                        return isArray ? updatedData : { ...page, data: updatedData };
                    })
                };
            });
            return { previousData };
        },
        onError: (err, postToBookmark, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['userThreads', userId], context.previousData);
            }
        },
    });

    const handleBookmark = (post) => {
        bookmarkMutation.mutate(post);
    };

    const handleLike = (post) => {
        likeMutation.mutate(post);
    };

    // Fetch user data
    const fetchUserData = useCallback(async () => {
        if (!userId) return;

        setIsLoading(true);
        setError(null);

        try {
            // Fetch user info and relationship in parallel
            const [userResponse, relationshipResponse] = await Promise.all([
                api.users.getById(userId),
                api.users.getRelationship(userId)
            ]);

            const userData = userResponse?.user || userResponse;
            const relationshipData = relationshipResponse?.relationship || relationshipResponse;

            setUser(userData);
            setRelationship(relationshipData);

            // Determine if we can view content
            const isPublic = userData?.type === 'PUBLIC';
            const isFollowing = ['FOLLOWING', 'MUTUAL'].includes(relationshipData);
            const isSelf = relationshipData === 'SELF';

            setCanViewContent(isPublic || isFollowing || isSelf);

        } catch (err) {
            console.error('Failed to load user:', err);
            setError(err.response?.data?.message || 'Failed to load user profile');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    // Infinite query for user threads
    const {
        data: threadsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isThreadsLoading
    } = useInfiniteQuery({
        queryKey: ['userThreads', userId],
        queryFn: async ({ pageParam = 1 }) => {
            return await api.users.getUserThreads(userId, { page: pageParam });
        },
        getNextPageParam: (lastPage) => {
            const pagination = lastPage.pagination;
            return pagination?.hasNextPage ? pagination.currentPage + 1 : undefined;
        },
        enabled: !!userId && canViewContent,
    });

    // Flatten pages
    const threads = useMemo(() => {
        return threadsData?.pages.flatMap(page => Array.isArray(page) ? page : page.data || []) || [];
    }, [threadsData]);

    const { ref: loadMoreRef, inView } = useInView();

    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Fetch media items
    const fetchMedia = useCallback(async () => {
        if (!userId || !canViewContent) return;

        setIsLoadingTab(true);

        try {
            // Get threads and extract media from them
            // Note: This logic for media tab is still manual and might need its own pagination later.
            // For now, let's keep it as is or ideally update it too. but let's focus on threads tab first.
            // The original code re-fetched ALL threads? No, it fetched default page.
            // If we want media from all threads, we might need a dedicated endpoint or iterate pages.
            // The API getMyMedia is for current user. For another user, we don't have getProfileMedia endpoint?
            // "api.users.getUserThreads(userId)" only gets first page.
            // So the original code for media was also broken (only showed media from first 20 threads).
            // Users usually have a separate media tab endpoint or we query threads with media.
            // For now, let's leave media tab logic as is (broken for pagination) or simple fallback.
            // But strict replacement is safer.
            const response = await api.users.getUserThreads(userId, { limit: 50 }); // Fetch more for media tab?
            const threadsData = response?.data || response || [];

            // Extract all media items with their thread reference
            const allMedia = [];
            threadsData.forEach(thread => {
                if (thread.media && thread.media.length > 0) {
                    thread.media.forEach(item => {
                        allMedia.push({
                            ...item,
                            thread: { id: thread.id }
                        });
                    });
                }
            });
            setMediaItems(allMedia);
        } catch (err) {
            console.error('Failed to load media:', err);
            setMediaItems([]);
        } finally {
            setIsLoadingTab(false);
        }
    }, [userId, canViewContent]);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    useEffect(() => {
        if (canViewContent && activeTab === 'media') {
            fetchMedia();
        }
    }, [canViewContent, activeTab, fetchMedia]);

    // Handle follow/unfollow
    const handleFollowAction = async () => {
        if (isFollowLoading) return;

        setIsFollowLoading(true);

        try {
            if (relationship === 'FOLLOWING' || relationship === 'MUTUAL') {
                await api.users.unfollow(userId);
                setRelationship('NONE');
                if (user?.type === 'PRIVATE') {
                    setCanViewContent(false);
                    setThreads([]);
                    setMediaItems([]);
                }
            } else if (relationship === 'NONE' || relationship === 'FOLLOWER') {
                const response = await api.users.follow(userId);
                const status = response?.status || response?.data?.status;
                setRelationship(status === 'PENDING' ? 'PENDING_OUTGOING' : 'FOLLOWING');
                if (user?.type === 'PUBLIC' || status === 'ACCEPTED') {
                    setCanViewContent(true);
                }
            }
        } catch (err) {
            console.error('Follow action failed:', err);
        } finally {
            setIsFollowLoading(false);
        }
    };

    // Memoized display values
    const displayName = useMemo(() => {
        if (user?.profile?.firstName || user?.profile?.lastName) {
            return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
        }
        return user?.username || 'User';
    }, [user?.profile?.firstName, user?.profile?.lastName, user?.username]);

    const avatarUrl = useMemo(() => {
        const photoUrl = getMediaUrl(user?.profile?.photoUrl);
        if (photoUrl) return photoUrl;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&size=128`;
    }, [user?.profile?.photoUrl, displayName]);

    // Stats from user data
    const stats = useMemo(() => ({
        posts: user?._count?.threads || 0,
        followers: user?._count?.followers || 0,
        following: user?._count?.following || 0,
    }), [user?._count]);

    // Handle post click - navigate to thread detail
    const handlePostClick = (thread) => {
        if (onPostClick) {
            onPostClick(thread);
        } else {
            navigate(`/thread/${thread.id}`);
        }
    };

    // Handle media click - navigate to thread detail
    const handleMediaClick = (mediaItem) => {
        if (mediaItem.thread?.id) {
            navigate(`/thread/${mediaItem.thread.id}`);
        }
    };

    const openFollowersModal = (type) => {
        if (!canViewContent) return;
        setModalType(type);
        setIsModalOpen(true);
    };

    // Render follow button based on relationship
    const renderFollowButton = () => {
        // If viewing self, render a spacer to maintain layout consistency
        if (relationship === 'SELF') {
            return <div className="px-6 py-2.5 font-semibold invisible">Spacer</div>;
        }

        const buttonConfigs = {
            NONE: { text: t('follow') || 'Follow', className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
            FOLLOWER: { text: t('followBack') || 'Follow Back', className: 'bg-indigo-600 text-white hover:bg-indigo-700' },
            FOLLOWING: { text: t('following') || 'Following', className: isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-red-500 hover:text-white' },
            MUTUAL: { text: t('following') || 'Following', className: isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-red-500 hover:text-white' },
            PENDING_OUTGOING: { text: t('requested') || 'Requested', className: isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500', disabled: true },
            PENDING_INCOMING: { text: t('respond') || 'Respond', className: 'bg-indigo-600 text-white hover:bg-indigo-700' }
        };

        const config = buttonConfigs[relationship] || buttonConfigs.NONE;

        return (
            <button
                onClick={handleFollowAction}
                disabled={config.disabled || isFollowLoading}
                className={`px-6 py-2.5 font-semibold rounded-xl transition-all ${config.className} ${isFollowLoading ? 'opacity-70' : ''
                    } ${config.disabled ? 'cursor-not-allowed' : ''}`}
            >
                {isFollowLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    config.text
                )}
            </button>
        );
    };

    // Render tab content
    const renderTabContent = () => {
        if (isLoadingTab || isThreadsLoading) {
            return (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                </div>
            );
        }

        switch (activeTab) {
            case 'posts':
                if (threads.length === 0) {
                    return (
                        <div className={`text-center py-12 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <UserIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            </div>
                            <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                {t('noPosts') || 'No posts yet'}
                            </h3>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                {displayName} hasn't posted anything yet
                            </p>
                        </div>
                    );
                }
                return (
                    <div className="space-y-4">
                        {threads.map((thread) => (
                            <PostCard
                                key={thread.id}
                                post={thread}
                                onClick={() => handlePostClick(thread)}
                                onLike={handleLike}
                                onShare={handleRepost}
                                onBookmark={handleBookmark}
                                isLiked={thread.isLiked}
                                isBookmarked={thread.isSaved}
                            />
                        ))}

                        {/* Load More Indicator */}
                        {(hasNextPage || isFetchingNextPage) && (
                            <div ref={loadMoreRef} className="flex flex-col items-center justify-center py-4 gap-2">
                                {isFetchingNextPage ? (
                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                ) : (
                                    <button
                                        onClick={() => fetchNextPage()}
                                        className={`text-sm font-medium hover:underline ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}
                                    >
                                        Load more posts
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );

            case 'media':
                if (mediaItems.length === 0) {
                    return (
                        <div className={`text-center py-12 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <ImageIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                            </div>
                            <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                {t('noMedia') || 'No media yet'}
                            </h3>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                {displayName} hasn't posted any photos or videos yet
                            </p>
                        </div>
                    );
                }
                return (
                    <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden">
                        {mediaItems.map((item, index) => (
                            <div
                                key={item.id || index}
                                className="aspect-square relative cursor-pointer group overflow-hidden"
                                onClick={() => handleMediaClick(item)}
                            >
                                {item.type === 'VIDEO' ? (
                                    <video
                                        src={getMediaUrl(item.url)}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <img
                                        src={getMediaUrl(item.url)}
                                        alt="Media"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <div className="text-white text-xs font-medium px-2 py-1 bg-black/50 rounded-full">
                                        View Post
                                    </div>
                                </div>
                                {item.type === 'VIDEO' && (
                                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                                        Video
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );

            default:
                return null;
        }
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={onBack}
                    className={`flex items-center gap-2 mb-6 font-medium ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    {t('back') || 'Back'}
                </button>
                <div className={`text-center py-12 rounded-2xl ${isDarkMode ? 'bg-gray-800 text-red-400' : 'bg-white text-red-600'
                    }`}>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Back Button */}
            <button
                onClick={() => onBack ? onBack() : navigate(-1)}
                className={`flex items-center gap-2 mb-4 font-medium ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
            >
                <ArrowLeftIcon className="w-5 h-5" />
                {t('back') || 'Back'}
            </button>

            {/* Cover Image */}
            <div className="relative h-48 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl overflow-hidden">
                {user?.profile?.coverUrl ? (
                    <img src={getMediaUrl(user.profile.coverUrl)} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
                )}
                <div className="absolute inset-0 bg-black/10" />
            </div>

            {/* Profile Info */}
            <div className="relative px-6 pb-6">
                {/* Avatar */}
                <div className="absolute -top-16 left-6">
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        className={`w-32 h-32 rounded-full object-cover border-4 shadow-xl ${isDarkMode ? 'border-gray-900' : 'border-white'}`}
                    />
                </div>

                {/* Action Button */}
                <div className="flex justify-end pt-4">
                    {renderFollowButton()}
                </div>

                {/* Name & Bio */}
                <div className="mt-8">
                    <div className="flex items-center gap-2">
                        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                            }`}>
                            {displayName}
                        </h1>
                        {user?.verified && <CheckBadgeIcon className="w-6 h-6 text-indigo-500" />}
                        <TierBadge points={user?.profile?.points || 0} />
                        {user?.type === 'PRIVATE' && (
                            <LockClosedIcon className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`} />
                        )}
                    </div>
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                        @{user?.username}
                    </p>
                    {user?.profile?.bio && (
                        <p className={`mt-3 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                            {user.profile.bio}
                        </p>
                    )}
                </div>

                {/* Stats - Now shows Posts, Followers, Following */}
                <div className={`flex items-center gap-8 mt-6 py-4 border-y ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
                    }`}>
                    <div className="text-center">
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                            {stats.posts}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t('posts') || 'Posts'}
                        </p>
                    </div>
                    <div
                        className={`text-center ${canViewContent ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
                        onClick={() => openFollowersModal('followers')}
                    >
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                            {stats.followers.toLocaleString()}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t('followers') || 'Followers'}
                        </p>
                    </div>
                    <div
                        className={`text-center ${canViewContent ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
                        onClick={() => openFollowersModal('following')}
                    >
                        <p className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                            {stats.following.toLocaleString()}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {t('following') || 'Following'}
                        </p>
                    </div>
                </div>

                {/* Tab Navigation */}
                {canViewContent && (
                    <div className={`flex mt-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                        {['posts', 'media'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors relative ${activeTab === tab ? 'text-indigo-600' :
                                    isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {t(tab) || tab.charAt(0).toUpperCase() + tab.slice(1)}
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-indigo-600 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Tab Content */}
                <div className="mt-6">
                    {canViewContent ? (
                        renderTabContent()
                    ) : (
                        // Private account - can't view
                        <div className={`text-center py-12 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
                            }`}>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                                }`}>
                                <LockClosedIcon className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                    }`} />
                            </div>
                            <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                }`}>
                                {t('privateAccount') || 'This account is private'}
                            </h3>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                {t('privateAccountMessage') || 'Follow this account to see their posts'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Followers/Following Modal */}
            <FollowersModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                targetUserId={userId}
                type={modalType}
                onUserClick={(u) => navigate(`/user/${u.id}`)}
            />
        </div>
    );
}
