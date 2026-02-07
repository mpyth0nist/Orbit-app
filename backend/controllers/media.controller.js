/**
 * Media Controller
 * 
 * Handles media uploads for threads and profile pictures.
 * 
 * @module controllers/media
 */

import { asyncHandler } from '../middleware/asyncHandler.js';
import { prisma } from '../utils/prisma.js';
import { logger } from '../utils/logger.js';
import { successResponse, errorResponse } from '../utils/response.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @desc    Upload media for a thread
 * @route   POST /api/media/thread
 * @access  Private
 */
export const uploadThreadMedia = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    if (!req.files || req.files.length === 0) {
        return errorResponse(res, 'No files uploaded', 400);
    }

    // Create media records in database
    const mediaRecords = req.files.map(file => ({
        userId,
        type: file.mimetype.startsWith('image/') ? 'IMAGE' : 'VIDEO',
        url: `/uploads/threads/${file.filename}`,
        size: file.size
    }));

    const createdMedia = await prisma.media.createMany({
        data: mediaRecords
    });

    // Get the created media IDs
    const media = await prisma.media.findMany({
        where: {
            userId,
            url: {
                in: mediaRecords.map(m => m.url)
            }
        },
        orderBy: { uploadedAt: 'desc' },
        take: req.files.length
    });

    logger.info('Thread media uploaded', { userId, count: req.files.length });

    return successResponse(
        res,
        {
            media: media.map(m => ({
                id: m.id,
                url: m.url,
                type: m.type,
                size: m.size
            }))
        },
        'Media uploaded successfully',
        201
    );
});

/**
 * @desc    Upload/update profile picture
 * @route   POST /api/media/profile-picture
 * @access  Private
 */
export const uploadProfilePicture = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;

    // Get current profile to delete old photo if exists
    const currentProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { photoUrl: true }
    });

    // Update profile with new photo URL
    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: { photoUrl }
    });

    // Delete old photo file if it exists and is different
    if (currentProfile?.photoUrl && currentProfile.photoUrl !== photoUrl) {
        const oldPhotoPath = path.join(__dirname, '..', currentProfile.photoUrl);
        try {
            if (fs.existsSync(oldPhotoPath)) {
                fs.unlinkSync(oldPhotoPath);
                logger.info('Old profile picture deleted', { userId, oldPath: currentProfile.photoUrl });
            }
        } catch (err) {
            logger.error('Failed to delete old profile picture', { userId, oldPath: currentProfile.photoUrl, error: err.message });
        }
    }

    logger.info('Profile picture updated', { userId, photoUrl });

    return successResponse(
        res,
        { photoUrl },
        'Profile picture updated successfully'
    );
});

/**
 * @desc    Upload/update profile banner
 * @route   POST /api/media/profile-banner
 * @access  Private
 */
export const uploadProfileBanner = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
    }

    const coverUrl = `/uploads/profiles/${req.file.filename}`;

    // Get current profile
    const currentProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { coverUrl: true }
    });

    // Update profile with new banner URL
    await prisma.profile.update({
        where: { userId },
        data: { coverUrl }
    });

    // Delete old banner file if it exists and is different
    if (currentProfile?.coverUrl && currentProfile.coverUrl !== coverUrl) {
        // Handle cases where path might be external URL
        if (currentProfile.coverUrl.startsWith('/uploads')) {
            const oldBannerPath = path.join(__dirname, '..', currentProfile.coverUrl);
            try {
                if (fs.existsSync(oldBannerPath)) {
                    fs.unlinkSync(oldBannerPath);
                    logger.info('Old profile banner deleted', { userId, oldPath: currentProfile.coverUrl });
                }
            } catch (err) {
                logger.error('Failed to delete old profile banner', { userId, oldPath: currentProfile.coverUrl, error: err.message });
            }
        }
    }

    logger.info('Profile banner updated', { userId, coverUrl });

    return successResponse(
        res,
        { coverUrl },
        'Profile banner updated successfully'
    );
});

/**
 * @desc    Delete media file
 * @route   DELETE /api/media/:id
 * @access  Private
 */
export const deleteMedia = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const mediaId = parseInt(req.params.id);

    if (isNaN(mediaId)) {
        return errorResponse(res, 'Invalid media ID', 400);
    }

    // Find media and verify ownership
    const media = await prisma.media.findUnique({
        where: { id: mediaId },
        select: { id: true, userId: true, url: true, threadId: true }
    });

    if (!media) {
        return errorResponse(res, 'Media not found', 404);
    }

    if (media.userId !== userId) {
        return errorResponse(res, 'You are not authorized to delete this media', 403);
    }


    // Delete from database
    await prisma.media.delete({
        where: { id: mediaId }
    });

    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', media.url);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        logger.error('Failed to delete media file from filesystem', { mediaId, filePath, error: err.message });
    }

    logger.info('Media deleted', { userId, mediaId });

    return successResponse(res, null, 'Media deleted successfully');
});
