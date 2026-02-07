/**
 * Query Keys - Centralized query key constants for React Query
 * 
 * Benefits:
 * - Prevents typos and inconsistencies
 * - Makes refactoring easier
 * - Provides type safety (when using TypeScript)
 * - Documents all query keys in one place
 */

// User & Auth
export const QUERY_KEYS = {
    // User
    user: ['user'],
    userById: (id) => ['user', id],
    userPosts: (userId) => ['user', 'posts', userId],
    userStats: ['user', 'stats'],

    // Auth
    currentUser: ['auth', 'current'],

    // Threads
    thread: (id) => ['thread', id],
    threads: (tab) => ['threads', tab],
    threadSearch: (query) => ['threads', 'search', query],

    // Posts (legacy - same as threads)
    posts: ['posts'],

    // Communities
    community: (id) => ['community', id],
    communities: ['communities'],
    myCommunities: ['communities', 'my'],
    communityThreads: (id, page) => ['community', id, 'threads', page],
    communityMembers: (id) => ['community', id, 'members'],
    communityMembership: (communityId, userId) => ['community', communityId, 'membership', userId],

    // Notifications
    notifications: ['notifications'],
    notificationsUnreadCount: ['notifications', 'unread-count'],
    notificationsByUser: (userEmail) => ['notifications', userEmail],

    // Search
    search: (query) => ['search', query],
    searchUsers: (query) => ['search', 'users', query],

    // Relationships
    followers: (userId) => ['user', userId, 'followers'],
    following: (userId) => ['user', userId, 'following'],
    relationship: (userId) => ['user', userId, 'relationship'],
};

// Helper function to invalidate related queries
export const invalidateQueries = {
    // Invalidate all community-related queries
    community: (queryClient, communityId) => {
        queryClient.invalidateQueries({ queryKey: ['community', communityId] });
        queryClient.invalidateQueries({ queryKey: ['community', communityId, 'threads'] });
        queryClient.invalidateQueries({ queryKey: ['community', communityId, 'members'] });
        queryClient.invalidateQueries({ queryKey: ['community', communityId, 'membership'] });
    },

    // Invalidate all thread-related queries
    thread: (queryClient, threadId) => {
        queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
        queryClient.invalidateQueries({ queryKey: ['threads'] });
        queryClient.invalidateQueries({ queryKey: ['posts'] });
    },

    // Invalidate all user-related queries
    user: (queryClient, userId) => {
        queryClient.invalidateQueries({ queryKey: ['user', userId] });
        queryClient.invalidateQueries({ queryKey: ['user', userId, 'posts'] });
        queryClient.invalidateQueries({ queryKey: ['user', userId, 'followers'] });
        queryClient.invalidateQueries({ queryKey: ['user', userId, 'following'] });
    },
};

export default QUERY_KEYS;
