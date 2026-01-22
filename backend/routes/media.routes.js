/**
 * Media Routes
 * 
 * Handles media upload endpoints for threads and profile pictures.
 * 
 * @module routes/media
 */

import express from 'express';
import {
    uploadThreadMedia as uploadThreadMediaController,
    uploadProfilePicture as uploadProfilePictureController,
    deleteMedia
} from '../controllers/media.controller.js';
import protect from '../middleware/protect.js';
import {
    uploadThreadMedia,
    uploadProfilePicture,
    handleUploadError
} from '../middleware/upload.js';
import { validateIdParam } from '../middleware/validation.js';

const router = express.Router();

/**
 * @route   POST /api/media/thread
 * @desc    Upload media files for a thread
 * @access  Private
 * @body    media - Array of media files (max 4, up to 50MB each)
 * 
 * @example POST /api/media/thread
 * Content-Type: multipart/form-data
 * Body: { media: [file1, file2] }
 */
router.post(
    '/thread',
    protect,
    uploadThreadMedia,
    handleUploadError,
    uploadThreadMediaController
);

/**
 * @route   POST /api/media/profile-picture
 * @desc    Upload/update profile picture
 * @access  Private
 * @body    profilePicture - Single image file (max 5MB)
 * 
 * @example POST /api/media/profile-picture
 * Content-Type: multipart/form-data
 * Body: { profilePicture: file }
 */
router.post(
    '/profile-picture',
    protect,
    uploadProfilePicture,
    handleUploadError,
    uploadProfilePictureController
);

/**
 * @route   DELETE /api/media/:id
 * @desc    Delete an uploaded media file (only if not attached to a thread)
 * @access  Private (Owner only)
 * @param   id - Media ID
 * 
 * @example DELETE /api/media/123
 */
router.delete('/:id', protect, validateIdParam, deleteMedia);

export default router;
