/**
 * User Controller
 * 
 * Handles user profile management, follow system, and user-related operations.
 * All functions use asyncHandler for consistent error handling.
 * 
 * @module controllers/user.controller
 */

import { prisma, selectUser, selectPublicUser, selectUserProfile, selectThreadWithUser } from '../utils/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logger, logDatabaseError } from '../utils/logger.js';
import {
    successResponse,
    errorResponse,
    paginatedResponse,
    createdResponse,
    deletedResponse
} from '../utils/response.js';
import { createFollowNotification, deleteNotification } from '../utils/notificationService.js';
import { normalizeThread, normalizeThreads } from '../utils/threads.js';
import { comparePassword, hashPassword } from '../utils/authService.js';

/**
 * @desc    Update user password
 * @route   PATCH /api/user/password
 * @access  Private
 */
export const updatePassword = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return errorResponse(res, 'Current and new password are required', 400);
    }

    if (newPassword.length < 8) {
        return errorResponse(res, 'New password must be at least 8 characters long', 400);
    }

    // Find user to get current password hash
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true }
    });

    if (!user) {
        return errorResponse(res, 'User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
        return errorResponse(res, 'Invalid current password', 401);
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedNewPassword }
    });

    logger.info('Password updated successfully', { userId });

    return successResponse(res, null, 'Password updated successfully');
});

/**
 * @desc    Get current user's information
 * @route   GET /api/user/
 * @access  Private
 */
export const getMyInfo = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: selectUser
    });

    if (!user) {
        logger.warn(`User not found during getMyInfo`, { userId });
        return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, {
        id: user.id,
        username: user.username,
        email: user.email,
        type: user.type,
        notificationsEnabled: user.notificationsEnabled,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        bio: user.profile?.bio,
        photoUrl: user.profile?.photoUrl,
        coverUrl: user.profile?.coverUrl,
        points: user.profile?.points
    }, 'User information retrieved successfully');
});

/**
 * @desc    Update current user's information
 * @route   PATCH /api/user/
 * @access  Private
 */
export const updateMyInfo = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { email, username, type, notificationsEnabled } = req.body;

    // Build update data object with only provided fields
    const updateData = {};
    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username;
    if (type !== undefined) updateData.type = type;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;

    const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: selectUser
    });

    logger.info('User account updated', {
        userId,
        username: user.username,
        typeChanged: type !== undefined,
        notificationsChanged: notificationsEnabled !== undefined
    });

    return successResponse(res, { user }, 'User account updated successfully');
});

/**
 * @desc    Get user by ID
 * @route   GET /api/user/:userId
 * @access  Private
 */
export const getUser = asyncHandler(async (req, res) => {
    const userId = Number(req.params.userId);

    // Additional validation (middleware should handle this, but double-check)
    if (!userId || isNaN(userId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: selectUserProfile
    });

    if (!user) {
        return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, { user }, 'User retrieved successfully');
});

/**
 * @desc    Get followers
 * @route   GET /api/user/followers OR /api/user/:userId/followers
 * @access  Private
 */
export const getFollowers = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId;
    const targetUserId = req.params.userId ? Number(req.params.userId) : currentUserId;

    // Check if target user exists and if content is accessible
    if (targetUserId !== currentUserId) {
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { type: true }
        });

        if (!targetUser) {
            return errorResponse(res, 'User not found', 404);
        }

        if (targetUser.type === 'PRIVATE') {
            const relationship = await prisma.follow.findUnique({
                where: {
                    followerId_followedId: {
                        followerId: currentUserId,
                        followedId: targetUserId
                    }
                }
            });

            if (!relationship || relationship.status !== 'ACCEPTED') {
                return errorResponse(res, 'This account is private. Follow them to see their followers.', 403);
            }
        }
    }

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [followers, totalCount] = await Promise.all([
        prisma.follow.findMany({
            where: {
                followedId: targetUserId,
                status: 'ACCEPTED'
            },
            select: {
                follower: {
                    select: selectPublicUser
                }
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        }),
        prisma.follow.count({
            where: {
                followedId: targetUserId,
                status: 'ACCEPTED'
            }
        })
    ]);

    const followersData = followers.map(f => f.follower).filter(Boolean);

    return paginatedResponse(
        res,
        followersData,
        { page, limit, total: totalCount },
        `Retrieved ${followersData.length} followers`
    );
});

/**
 * @desc    Get following
 * @route   GET /api/user/following OR /api/user/:userId/following
 * @access  Private
 */
export const getFollowed = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId;
    const targetUserId = req.params.userId ? Number(req.params.userId) : currentUserId;

    // Check if target user exists and if content is accessible
    if (targetUserId !== currentUserId) {
        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { type: true }
        });

        if (!targetUser) {
            return errorResponse(res, 'User not found', 404);
        }

        if (targetUser.type === 'PRIVATE') {
            const relationship = await prisma.follow.findUnique({
                where: {
                    followerId_followedId: {
                        followerId: currentUserId,
                        followedId: targetUserId
                    }
                }
            });

            if (!relationship || relationship.status !== 'ACCEPTED') {
                return errorResponse(res, 'This account is private. Follow them to see who they follow.', 403);
            }
        }
    }

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [followedRecords, totalCount] = await Promise.all([
        prisma.follow.findMany({
            where: {
                followerId: targetUserId,
                status: 'ACCEPTED'
            },
            select: {
                followed: {
                    select: selectPublicUser
                }
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        }),
        prisma.follow.count({
            where: {
                followerId: targetUserId,
                status: 'ACCEPTED'
            }
        })
    ]);

    const followedAccounts = followedRecords.map(f => f.followed).filter(Boolean);

    return paginatedResponse(
        res,
        followedAccounts,
        { page, limit, total: totalCount },
        `Retrieved ${followedAccounts.length} following`
    );
});

/**
 * @desc    Follow a user
 * @route   POST /api/user/follow/:followed
 * @access  Private
 */
export const follow = asyncHandler(async (req, res) => {
    const followedId = Number(req.params.followed);
    const followerId = req.user.userId;
    console.log(followerId, followedId);

    // Validation
    if (!followedId || isNaN(followedId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    // Prevent self-follow
    if (followerId === followedId) {
        return errorResponse(res, 'You cannot follow yourself', 400);
    }

    // Check if followed user exists and get their account type
    const followedUser = await prisma.user.findUnique({
        where: { id: followedId },
        select: {
            id: true,
            username: true,
            type: true
        }
    });

    if (!followedUser) {
        return errorResponse(res, 'User not found', 404);
    }

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
        where: {
            followerId_followedId: {
                followerId,
                followedId,

            },
            status: { in: ['PENDING', 'ACCEPTED'] }
        }
    });

    if (existingFollow) {
        return errorResponse(res, 'You are already following this user', 400);
    }

    const accountType = followedUser.type;
    const followStatus = accountType === 'PRIVATE' ? 'PENDING' : 'ACCEPTED';

    // Create follow record
    await prisma.follow.create({
        data: {
            followedId,
            followerId,
            status: followStatus
        }
    });

    // Create notification for the followed user
    const notificationType = accountType === 'PRIVATE' ? 'FOLLOW_REQUEST' : 'NEW_FOLLOW';
    await createFollowNotification(followerId, followedId, notificationType);

    logger.info('User followed', {
        followerId,
        followedId,
        followedUsername: followedUser.username,
        status: followStatus
    });

    return createdResponse(
        res,
        {
            followedUser: {
                id: followedUser.id,
                username: followedUser.username
            },
            status: followStatus
        },
        accountType === 'PRIVATE'
            ? 'Follow request sent to user'
            : 'Successfully followed user'
    );
});

/**
 * @desc    Unfollow a user
 * @route   DELETE /api/user/follow/:followed
 * @access  Private
 */
export const unfollow = asyncHandler(async (req, res) => {
    const followerId = req.user.userId;
    const followedId = Number(req.params.followed);

    // Validation
    if (!followedId || isNaN(followedId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    // Check if follow relationship exists
    const existingFollow = await prisma.follow.findUnique({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        }
    });

    if (!existingFollow) {
        return errorResponse(res, 'You are not following this user', 400);
    }

    await prisma.follow.delete({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        }
    });

    // Delete NEW_FOLLOW or FOLLOW_REQUEST notification
    await deleteNotification({
        actorId: followerId,
        receiverId: followedId,
        type: 'NEW_FOLLOW',
        entityType: 'USER'
    });
    await deleteNotification({
        actorId: followerId,
        receiverId: followedId,
        type: 'FOLLOW_REQUEST',
        entityType: 'USER'
    });

    logger.info('User unfollowed', { followerId, followedId });

    return deletedResponse(res, 'Successfully unfollowed user');
});

/**
 * @desc    Remove a follower
 * @route   DELETE /api/user/followers/:follower
 * @access  Private
 */
export const removeFollower = asyncHandler(async (req, res) => {
    const followerId = Number(req.params.follower);
    const followedId = req.user.userId;

    // Validation
    if (!followerId || isNaN(followerId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    // Check if follow relationship exists
    const existingFollow = await prisma.follow.findUnique({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        }
    });

    if (!existingFollow) {
        return errorResponse(res, 'This user is not following you', 400);
    }

    await prisma.follow.delete({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        }
    });

    logger.info('Follower removed', { followerId, followedId });

    return deletedResponse(res, 'Successfully removed follower');
});

/**
 * @desc    Accept or reject a follow request
 * @route   PATCH /api/user/follow-requests/:follower
 * @access  Private
 */
export const updateRequest = asyncHandler(async (req, res) => {
    const followerId = Number(req.params.follower);
    const followedId = req.user.userId;
    const { isAccepted } = req.body;

    // Validation
    if (!followerId || isNaN(followerId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    if (typeof isAccepted !== 'boolean') {
        return errorResponse(res, 'isAccepted must be a boolean value', 400);
    }

    const newStatus = isAccepted ? 'ACCEPTED' : 'REFUSED';

    const updatedFollowRequest = await prisma.follow.update({
        where: {
            followerId_followedId: {
                followerId,
                followedId
            }
        },
        data: { status: newStatus }
    });


    // Handle notifications based on acceptance
    if (isAccepted) {
        // Delete FOLLOW_REQUEST notification
        await deleteNotification({
            actorId: followerId,
            receiverId: followedId,
            type: 'FOLLOW_REQUEST',
            entityType: 'USER'
        });

        // Create ACCEPTED_FOLLOW notification for the follower
        await createFollowNotification(followerId, followedId, 'ACCEPTED_FOLLOW');
    } else {
        // Delete FOLLOW_REQUEST notification on rejection
        await deleteNotification({
            actorId: followerId,
            receiverId: followedId,
            type: 'FOLLOW_REQUEST',
            entityType: 'USER'
        });

        await prisma.follow.delete({
            where: {
                followerId_followedId: {
                    followerId,
                    followedId
                }
            }
        });


    }

    logger.info('Follow request updated', {
        followerId,
        followedId,
        status: newStatus
    });

    return successResponse(
        res,
        { status: newStatus },
        isAccepted ? 'Follow request accepted' : 'Follow request rejected'
    );
});

/**
 * @desc    Get current user's threads
 * @route   GET /api/user/threads
 * @access  Private
 */
export const getMyThreads = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [threads, totalCount] = await Promise.all([
        prisma.thread.findMany({
            where: {
                userId,
                communityId: null
            },
            select: selectThreadWithUser,
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        }),
        prisma.thread.count({
            where: {
                userId,
                communityId: null
            }
        })
    ]);

    // Normalize threads (isLiked is usually false for own threads unless we want to show it)
    const formattedThreads = normalizeThreads(threads);

    return paginatedResponse(
        res,
        formattedThreads,
        { page, limit, total: totalCount },
        `Retrieved ${threads.length} threads`
    );
});

/**
 * @desc    Get posts that the current user has liked
 * @route   GET /api/user/likes
 * @access  Private
 */
export const getMyLikedPosts = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [likedPosts, totalCount] = await Promise.all([
        prisma.reaction.findMany({
            where: {
                userId,
                threadId: { not: null }
            },
            select: {
                id: true,
                createdAt: true,
                thread: {
                    select: selectThreadWithUser
                }
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.reaction.count({
            where: {
                userId,
                threadId: { not: null }
            }
        })
    ]);

    // Extract threads from reactions and normalize
    const threads = normalizeThreads(likedPosts.map(r => r.thread).filter(Boolean), new Set(likedPosts.map(r => r.thread?.id).filter(Boolean)));

    logger.info('User liked posts retrieved', { userId, totalCount });

    return paginatedResponse(
        res,
        threads,
        { page, limit, total: totalCount },
        `Retrieved ${threads.length} liked posts`
    );
});

/**
 * @desc    Get media files uploaded by the current user
 * @route   GET /api/user/media
 * @access  Private
 */
export const getMyMedia = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [media, totalCount] = await Promise.all([
        prisma.media.findMany({
            where: {
                userId,
                threadId: { not: null } // Only media attached to threads
            },
            select: {
                id: true,
                url: true,
                type: true,
                uploadedAt: true,
                thread: {
                    select: selectThreadWithUser
                }
            },
            skip,
            take: limit,
            orderBy: { uploadedAt: 'desc' }
        }),
        prisma.media.count({
            where: {
                userId,
                threadId: { not: null }
            }
        })
    ]);

    // Normalize nested threads
    const normalizedMedia = media.map(m => ({
        ...m,
        thread: normalizeThread(m.thread)
    }));

    logger.info('User media retrieved', { userId, totalCount });

    return paginatedResponse(
        res,
        normalizedMedia,
        { page, limit, total: totalCount },
        `Retrieved ${media.length} media files`
    );
});

/**
 * @desc    Update user profile
 * @route   PATCH /api/user/profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { firstName, lastName, bio } = req.body;

    // Build update data object with only provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;

    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: updateData
    });

    logger.info('Profile updated', { userId });

    return successResponse(res, { profile: updatedProfile }, 'Profile updated successfully');
});

/**
 * @desc    Update user profile picture
 * @route   PATCH /api/user/profile/picture
 * @access  Private
 */
export const updateProfilePicture = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { photoUrl } = req.body;

    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: { photoUrl }
    });

    logger.info('Profile picture updated', { userId });

    return successResponse(res, { profile: updatedProfile }, 'Profile picture updated successfully');
});

/**
 * @desc    Update user profile banner
 * @route   PATCH /api/user/profile/banner
 * @access  Private
 */
export const updateProfileBanner = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { coverUrl } = req.body;

    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: { coverUrl }
    });

    logger.info('Profile banner updated', { userId });

    return successResponse(res, { profile: updatedProfile }, 'Profile banner updated successfully');
});

/**
 * @desc    Get pending follow requests for current user
 * @route   GET /api/user/follow-requests
 * @access  Private
 */
export const getPendingFollowRequests = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Pagination support
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [requests, totalCount] = await Promise.all([
        prisma.follow.findMany({
            where: {
                followedId: userId,
                status: 'PENDING'
            },
            select: {
                follower: {
                    select: selectPublicUser
                },
                createdAt: true
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc'
            }
        }),
        prisma.follow.count({
            where: {
                followedId: userId,
                status: 'PENDING'
            }
        })
    ]);

    const formattedRequests = requests.map(r => ({
        user: r.follower,
        requestedAt: r.createdAt
    }));

    logger.info('Pending follow requests retrieved', {
        userId,
        requestsCount: totalCount
    });

    return res.status(200).json({
        success: true,
        data: {
            requests: formattedRequests,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + formattedRequests.length < totalCount
            }
        },
        message: totalCount === 0
            ? 'No pending follow requests'
            : `You have ${totalCount} pending follow request${totalCount > 1 ? 's' : ''}`
    });
});

/**
 * @desc    Search users by username or name with relevance boosting
 * @route   GET /api/user/search
 * @access  Private
 */
export const searchUsers = asyncHandler(async (req, res) => {
    const searchTerm = req.query.q?.trim();
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    if (!searchTerm || searchTerm.length < 2) {
        return errorResponse(res, 'Search term must be at least 2 characters', 400);
    }

    const searchLower = searchTerm.toLowerCase();
    const parts = searchTerm.split(/\s+/).filter(part => part.length > 0);

    // Fetch all matching users first (we need to sort in-memory for relevance)
    const searchConditions = {
        OR: [
            // Exact full string match in any field
            {
                username: {
                    contains: searchTerm,
                    mode: 'insensitive'
                }
            },
            {
                profile: {
                    firstName: {
                        contains: searchTerm,
                        mode: 'insensitive'
                    }
                }
            },
            {
                profile: {
                    lastName: {
                        contains: searchTerm,
                        mode: 'insensitive'
                    }
                }
            }
        ]
    };

    // If multiple words, enable "all words must be present somewhere" logic
    if (parts.length > 1) {
        searchConditions.OR.push({
            AND: parts.map(part => ({
                OR: [
                    { username: { contains: part, mode: 'insensitive' } },
                    { profile: { firstName: { contains: part, mode: 'insensitive' } } },
                    { profile: { lastName: { contains: part, mode: 'insensitive' } } }
                ]
            }))
        });
    }

    const [allUsers, totalCount] = await Promise.all([
        prisma.user.findMany({
            where: searchConditions,
            select: selectPublicUser
        }),
        prisma.user.count({
            where: searchConditions
        })
    ]);

    // Sort by relevance: exact match > starts with > contains
    const sortedUsers = allUsers.sort((a, b) => {
        const aUsername = a.username.toLowerCase();
        const bUsername = b.username.toLowerCase();
        const aFirstName = a.profile?.firstName?.toLowerCase() || '';
        const aLastName = a.profile?.lastName?.toLowerCase() || '';
        const bFirstName = b.profile?.firstName?.toLowerCase() || '';
        const bLastName = b.profile?.lastName?.toLowerCase() || '';

        // Priority 1: Exact username match
        if (aUsername === searchLower && bUsername !== searchLower) return -1;
        if (bUsername === searchLower && aUsername !== searchLower) return 1;

        // Priority 2: Username starts with search term
        if (aUsername.startsWith(searchLower) && !bUsername.startsWith(searchLower)) return -1;
        if (bUsername.startsWith(searchLower) && !aUsername.startsWith(searchLower)) return 1;

        // Priority 3: First name exact match
        if (aFirstName === searchLower && bFirstName !== searchLower) return -1;
        if (bFirstName === searchLower && aFirstName !== searchLower) return 1;

        // Priority 4: Last name exact match
        if (aLastName === searchLower && bLastName !== searchLower) return -1;
        if (bLastName === searchLower && aLastName !== searchLower) return 1;

        // Priority 5: First name starts with
        if (aFirstName.startsWith(searchLower) && !bFirstName.startsWith(searchLower)) return -1;
        if (bFirstName.startsWith(searchLower) && !aFirstName.startsWith(searchLower)) return 1;

        // Priority 6: Last name starts with
        if (aLastName.startsWith(searchLower) && !bLastName.startsWith(searchLower)) return -1;
        if (bLastName.startsWith(searchLower) && !aLastName.startsWith(searchLower)) return 1;

        // Default: alphabetical by username
        return aUsername.localeCompare(bUsername);
    });

    // Apply pagination after sorting
    const paginatedUsers = sortedUsers.slice(skip, skip + limit);

    logger.info('User search performed', {
        userId: req.user.userId,
        searchTerm,
        resultsCount: totalCount
    });

    return res.status(200).json({
        success: true,
        data: {
            users: paginatedUsers,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasMore: skip + paginatedUsers.length < totalCount
            }
        },
        message: totalCount === 0
            ? `No users found for "${searchTerm}"`
            : `Found ${totalCount} user${totalCount > 1 ? 's' : ''}`
    });
});

/**
 * @desc    Get current user's statistics (followers, following, threads counts)
 * @route   GET /api/user/stats
 * @access  Private
 */
export const getUserStats = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    const [followersCount, followingCount, threadsCount, pendingRequestsCount] = await Promise.all([
        prisma.follow.count({
            where: { followedId: userId, status: 'ACCEPTED' }
        }),
        prisma.follow.count({
            where: { followerId: userId, status: 'ACCEPTED' }
        }),
        prisma.thread.count({
            where: { userId }
        }),
        prisma.follow.count({
            where: { followedId: userId, status: 'PENDING' }
        })
    ]);

    logger.info('User stats retrieved', { userId });

    return successResponse(res, {
        followers: followersCount,
        following: followingCount,
        threads: threadsCount,
        pendingRequests: pendingRequestsCount
    }, 'Statistics retrieved successfully');
});

/**
 * @desc    Check relationship status with another user
 * @route   GET /api/user/:id/relationship
 * @access  Private
 */
export const checkRelationship = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId;
    const targetUserId = Number(req.params.userId);

    if (!targetUserId || isNaN(targetUserId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    if (targetUserId === currentUserId) {
        return successResponse(res, { relationship: 'SELF' }, 'Relationship checked successfully');
    }
    const [followed, follower] = await Promise.all([
        prisma.follow.findUnique({
            where: {
                followerId_followedId: {
                    followerId: currentUserId,
                    followedId: targetUserId
                }
            },
            select: { status: true }
        }),
        prisma.follow.findUnique({
            where: {
                followerId_followedId: {
                    followerId: targetUserId,
                    followedId: currentUserId
                }
            },
            select: { status: true }
        })
    ]);

    const followingStatus = followed?.status;
    const followerStatus = follower?.status;

    // Determine relationship
    let relationship;

    if (followingStatus === 'ACCEPTED' && followerStatus === 'ACCEPTED') {
        relationship = 'MUTUAL';
    } else if (followingStatus === 'ACCEPTED') {
        relationship = 'FOLLOWING';
    } else if (followingStatus === 'PENDING') {
        relationship = 'PENDING_OUTGOING';
    } else if (followerStatus === 'ACCEPTED') {
        relationship = 'FOLLOWER';
    } else if (followerStatus === 'PENDING') {
        relationship = 'PENDING_INCOMING';
    } else {
        relationship = 'NONE';
    }

    logger.info('Relationship checked', { currentUserId, targetUserId, relationship });

    return successResponse(res, { relationship }, 'Relationship checked successfully');
});

/**
 * @desc    Get user by username
 * @route   GET /api/user/username/:username
 * @access  Private
 */
export const getUserByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username || username.trim().length < 3) {
        return errorResponse(res, 'Username must be at least 3 characters', 400);
    }

    const user = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
        select: selectPublicUser
    });

    if (!user) {
        return errorResponse(res, 'User not found', 404);
    }

    logger.info('User retrieved by username', { username, userId: user.id });

    return successResponse(res, { user }, 'User retrieved successfully');
});

/**
 * @desc    Get a user's threads (with privacy check)
 * @route   GET /api/user/:userId/threads
 * @access  Private
 */
export const getUserThreads = asyncHandler(async (req, res) => {
    const targetUserId = Number(req.params.userId);
    const currentUserId = req.user.userId;

    // Validation
    if (!targetUserId || isNaN(targetUserId)) {
        return errorResponse(res, 'Invalid user ID', 400);
    }

    // Get target user to check account type
    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
            id: true,
            username: true,
            type: true
        }
    });

    if (!targetUser) {
        return errorResponse(res, 'User not found', 404);
    }

    // Check if current user can view threads
    let canViewThreads = false;

    // User can always view their own threads
    if (currentUserId === targetUserId) {
        canViewThreads = true;
    }
    // Public accounts are visible to everyone
    else if (targetUser.type === 'PUBLIC') {
        canViewThreads = true;
    }
    // For private accounts, check if following
    else {
        const followStatus = await prisma.follow.findUnique({
            where: {
                followerId_followedId: {
                    followerId: currentUserId,
                    followedId: targetUserId
                }
            },
            select: { status: true }
        });
        canViewThreads = followStatus?.status === 'ACCEPTED';
    }

    if (!canViewThreads) {
        return errorResponse(res, 'This account is private', 403);
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const [threads, totalCount] = await Promise.all([
        prisma.thread.findMany({
            where: {
                userId: targetUserId,
                communityId: null
            },
            select: selectThreadWithUser,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.thread.count({
            where: {
                userId: targetUserId,
                communityId: null
            }
        })
    ]);

    // Get thread IDs to check which ones the current user has liked
    const threadIds = threads.map(t => t.id);

    // Fetch current user's reactions for these threads
    const userReactions = await prisma.reaction.findMany({
        where: {
            userId: currentUserId,
            threadId: { in: threadIds }
        },
        select: { threadId: true }
    });

    // Create a Set for quick lookup
    const likedThreadIds = new Set(userReactions.map(r => r.threadId));

    console.log(`[getUserThreads] User ${currentUserId} viewing user ${targetUserId}'s threads`);
    console.log(`[getUserThreads] Found ${userReactions.length} liked threads:`, Array.from(likedThreadIds));

    // Format threads with normalization
    const formattedThreads = normalizeThreads(threads, likedThreadIds);

    logger.info('User threads retrieved', {
        currentUserId,
        targetUserId,
        threadsCount: threads.length
    });

    return paginatedResponse(
        res,
        formattedThreads,
        { page, limit, total: totalCount },
        `Retrieved ${threads.length} threads`
    );
});