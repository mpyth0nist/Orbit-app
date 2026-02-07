import express from 'express';
import rateLimit from 'express-rate-limit';
import protect from '../middleware/protect.js';
import { uploadCommunityBanner, handleUploadError } from '../middleware/upload.js';
import {
    validateCreateCommunity,
    validateUpdateCommunity,
    validateUpdateMemberRole,
    validateIdParam
} from '../middleware/validation.js';
import {
    createCommunity,
    getCommunity,
    getCommunities,
    updateCommunity,
    deleteCommunity,
    getCommunityThreads,
    pinThread,
    getMyCommunities,
    uploadBanner
} from '../controllers/communities.controller.js';
import {
    joinCommunity,
    leaveCommunity,
    getMembers,
    getMembership,
    updateMemberRole,
    kickMember,
    banMember,
    unbanMember
} from '../controllers/communityMembers.controller.js';

const router = express.Router();

// Rate limiter for community creation
const createCommunityLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 communities per 15 minutes
    message: {
        success: false,
        message: 'Too many communities created. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// All routes require authentication
router.use(protect);

// Community CRUD
router.post('/', createCommunityLimiter, validateCreateCommunity, createCommunity);
router.get('/', getCommunities);
router.get('/my', getMyCommunities);
router.get('/:id', validateIdParam, getCommunity);
router.patch('/:id', validateIdParam, validateUpdateCommunity, updateCommunity);
router.delete('/:id', validateIdParam, deleteCommunity);
router.post('/:id/banner', validateIdParam, uploadCommunityBanner, handleUploadError, uploadBanner);

// Community threads
router.get('/:id/threads', validateIdParam, getCommunityThreads);
router.post('/:id/threads/:threadId/pin', pinThread);

// Membership
router.post('/:id/join', validateIdParam, joinCommunity);
router.post('/:id/leave', validateIdParam, leaveCommunity);
router.get('/:id/members', validateIdParam, getMembers);
router.get('/:id/membership', validateIdParam, getMembership); // New efficient endpoint

// Member management (admin only)
router.patch('/:id/members/:userId/role', validateUpdateMemberRole, updateMemberRole);
router.delete('/:id/members/:userId', kickMember);
router.post('/:id/members/:userId/ban', banMember);
router.delete('/:id/members/:userId/ban', unbanMember);

export default router;

