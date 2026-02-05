import { asyncHandler } from '../middleware/asyncHandler.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import { prisma } from '../utils/prisma.js';
import logger from '../utils/logger.js';

/**
 * Join a community
 * 
 * @route   POST /api/communities/:id/join
 * @access  Private
 */
export const joinCommunity = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const communityId = parseInt(req.params.id);

    if (isNaN(communityId)) {
        return errorResponse(res, 'Invalid community ID', 400);
    }

    // Check community exists
    const community = await prisma.community.findUnique({
        where: { id: communityId }
    });

    if (!community) {
        return errorResponse(res, 'Community not found', 404);
    }

    // Check existing membership
    const existingMembership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId }
        }
    });

    if (existingMembership) {
        if (existingMembership.status === 'BANNED') {
            return errorResponse(res, 'You are banned from this community', 403);
        }
        if (existingMembership.status === 'ACTIVE') {
            return errorResponse(res, 'You are already a member of this community', 400);
        }
    }

    // Create or update membership
    const membership = await prisma.communityMember.upsert({
        where: {
            communityId_userId: { communityId, userId }
        },
        create: {
            communityId,
            userId,
            role: 'MEMBER',
            status: 'ACTIVE'
        },
        update: {
            status: 'ACTIVE',
            role: 'MEMBER'
        }
    });

    logger.info('User joined community', { userId, communityId });

    return successResponse(res, membership, 'Joined community successfully');
});

/**
 * Leave a community
 * 
 * @route   POST /api/communities/:id/leave
 * @access  Private
 */
export const leaveCommunity = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const communityId = parseInt(req.params.id);

    if (isNaN(communityId)) {
        return errorResponse(res, 'Invalid community ID', 400);
    }

    // Check community exists
    const community = await prisma.community.findUnique({
        where: { id: communityId }
    });

    if (!community) {
        return errorResponse(res, 'Community not found', 404);
    }

    // Creator cannot leave
    if (community.creatorId === userId) {
        return errorResponse(res, 'Community creator cannot leave. Transfer ownership or delete the community.', 400);
    }

    // Check membership
    const membership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId }
        }
    });

    if (!membership || membership.status !== 'ACTIVE') {
        return errorResponse(res, 'You are not a member of this community', 400);
    }

    await prisma.communityMember.delete({
        where: { id: membership.id }
    });

    logger.info('User left community', { userId, communityId });

    return successResponse(res, null, 'Left community successfully');
});

/**
 * Get community members
 * 
 * @route   GET /api/communities/:id/members
 * @access  Private
 */
export const getMembers = asyncHandler(async (req, res) => {
    const communityId = parseInt(req.params.id);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    if (isNaN(communityId)) {
        return errorResponse(res, 'Invalid community ID', 400);
    }

    // Check community exists
    const community = await prisma.community.findUnique({
        where: { id: communityId }
    });

    if (!community) {
        return errorResponse(res, 'Community not found', 404);
    }

    const [members, total] = await Promise.all([
        prisma.communityMember.findMany({
            where: {
                communityId,
                status: 'ACTIVE'
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        profile: {
                            select: {
                                firstName: true,
                                lastName: true,
                                photoUrl: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { role: 'asc' }, // Admins first
                { joinedAt: 'asc' }
            ],
            skip,
            take: limit
        }),
        prisma.communityMember.count({
            where: { communityId, status: 'ACTIVE' }
        })
    ]);

    const result = members.map(m => ({
        ...m.user,
        role: m.role,
        joinedAt: m.joinedAt,
        isCreator: community.creatorId === m.userId
    }));

    return paginatedResponse(res, result, { page, limit, total }, 'Members retrieved successfully');
});

/**
 * Promote member to admin
 * 
 * @route   PATCH /api/communities/:id/members/:userId/role
 * @access  Private (Admin only)
 */
export const updateMemberRole = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId;
    const communityId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);
    const { role } = req.body;

    if (isNaN(communityId) || isNaN(targetUserId)) {
        return errorResponse(res, 'Invalid community or user ID', 400);
    }

    if (!['ADMIN', 'MEMBER'].includes(role)) {
        return errorResponse(res, 'Invalid role. Must be ADMIN or MEMBER', 400);
    }

    // Get community
    const community = await prisma.community.findUnique({
        where: { id: communityId }
    });

    if (!community) {
        return errorResponse(res, 'Community not found', 404);
    }

    // Check current user is admin
    const currentMembership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId: currentUserId }
        }
    });

    if (!currentMembership || currentMembership.role !== 'ADMIN') {
        return errorResponse(res, 'Only admins can change member roles', 403);
    }

    // Check target membership
    const targetMembership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId: targetUserId }
        }
    });

    if (!targetMembership || targetMembership.status !== 'ACTIVE') {
        return errorResponse(res, 'Target user is not an active member', 404);
    }

    // Cannot demote the creator
    if (role === 'MEMBER' && community.creatorId === targetUserId) {
        return errorResponse(res, 'Cannot demote the community creator', 400);
    }

    // Only creator can demote admins
    if (role === 'MEMBER' && targetMembership.role === 'ADMIN' && community.creatorId !== currentUserId) {
        return errorResponse(res, 'Only the community creator can demote admins', 403);
    }

    const updated = await prisma.communityMember.update({
        where: { id: targetMembership.id },
        data: { role }
    });

    logger.info('Member role updated', { communityId, targetUserId, role, updatedBy: currentUserId });

    return successResponse(res, updated, `Member ${role === 'ADMIN' ? 'promoted to admin' : 'demoted to member'} successfully`);
});

/**
 * Kick member from community
 * 
 * @route   DELETE /api/communities/:id/members/:userId
 * @access  Private (Admin only)
 */
export const kickMember = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId;
    const communityId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);

    if (isNaN(communityId) || isNaN(targetUserId)) {
        return errorResponse(res, 'Invalid community or user ID', 400);
    }

    // Get community
    const community = await prisma.community.findUnique({
        where: { id: communityId }
    });

    if (!community) {
        return errorResponse(res, 'Community not found', 404);
    }

    // Check current user is admin
    const currentMembership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId: currentUserId }
        }
    });

    if (!currentMembership || currentMembership.role !== 'ADMIN') {
        return errorResponse(res, 'Only admins can kick members', 403);
    }

    // Cannot kick the creator
    if (community.creatorId === targetUserId) {
        return errorResponse(res, 'Cannot kick the community creator', 400);
    }

    // Check target membership
    const targetMembership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId: targetUserId }
        }
    });

    if (!targetMembership) {
        return errorResponse(res, 'User is not a member of this community', 404);
    }

    // Only creator can kick admins
    if (targetMembership.role === 'ADMIN' && community.creatorId !== currentUserId) {
        return errorResponse(res, 'Only the community creator can kick admins', 403);
    }

    await prisma.communityMember.delete({
        where: { id: targetMembership.id }
    });

    logger.info('Member kicked', { communityId, targetUserId, kickedBy: currentUserId });

    return successResponse(res, null, 'Member kicked successfully');
});

/**
 * Ban member from community
 * 
 * @route   POST /api/communities/:id/members/:userId/ban
 * @access  Private (Admin only)
 */
export const banMember = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId;
    const communityId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);

    if (isNaN(communityId) || isNaN(targetUserId)) {
        return errorResponse(res, 'Invalid community or user ID', 400);
    }

    // Get community
    const community = await prisma.community.findUnique({
        where: { id: communityId }
    });

    if (!community) {
        return errorResponse(res, 'Community not found', 404);
    }

    // Check current user is admin
    const currentMembership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId: currentUserId }
        }
    });

    if (!currentMembership || currentMembership.role !== 'ADMIN') {
        return errorResponse(res, 'Only admins can ban members', 403);
    }

    // Cannot ban the creator
    if (community.creatorId === targetUserId) {
        return errorResponse(res, 'Cannot ban the community creator', 400);
    }

    // Only creator can ban admins
    const targetMembership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId: targetUserId }
        }
    });

    if (targetMembership?.role === 'ADMIN' && community.creatorId !== currentUserId) {
        return errorResponse(res, 'Only the community creator can ban admins', 403);
    }

    // Upsert to handle both existing members and new bans
    const banned = await prisma.communityMember.upsert({
        where: {
            communityId_userId: { communityId, userId: targetUserId }
        },
        create: {
            communityId,
            userId: targetUserId,
            role: 'MEMBER',
            status: 'BANNED'
        },
        update: {
            status: 'BANNED',
            role: 'MEMBER'
        }
    });

    logger.info('Member banned', { communityId, targetUserId, bannedBy: currentUserId });

    return successResponse(res, banned, 'Member banned successfully');
});

/**
 * Unban member from community
 * 
 * @route   DELETE /api/communities/:id/members/:userId/ban
 * @access  Private (Admin only)
 */
export const unbanMember = asyncHandler(async (req, res) => {
    const currentUserId = req.user.userId;
    const communityId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);

    if (isNaN(communityId) || isNaN(targetUserId)) {
        return errorResponse(res, 'Invalid community or user ID', 400);
    }

    // Check current user is admin
    const currentMembership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId: currentUserId }
        }
    });

    if (!currentMembership || currentMembership.role !== 'ADMIN') {
        return errorResponse(res, 'Only admins can unban members', 403);
    }

    // Check target is banned
    const targetMembership = await prisma.communityMember.findUnique({
        where: {
            communityId_userId: { communityId, userId: targetUserId }
        }
    });

    if (!targetMembership || targetMembership.status !== 'BANNED') {
        return errorResponse(res, 'User is not banned from this community', 404);
    }

    // Remove the ban record (they will need to rejoin)
    await prisma.communityMember.delete({
        where: { id: targetMembership.id }
    });

    logger.info('Member unbanned', { communityId, targetUserId, unbannedBy: currentUserId });

    return successResponse(res, null, 'Member unbanned successfully');
});
