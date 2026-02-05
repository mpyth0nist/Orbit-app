import express from 'express';
import protect from '../middleware/protect.js';
import {
    createCommunity,
    getCommunity,
    getCommunities,
    updateCommunity,
    deleteCommunity,
    getCommunityThreads,
    pinThread,
    getMyCommunities
} from '../controllers/communities.controller.js';
import {
    joinCommunity,
    leaveCommunity,
    getMembers,
    updateMemberRole,
    kickMember,
    banMember,
    unbanMember
} from '../controllers/communityMembers.controller.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Community CRUD
router.post('/', createCommunity);
router.get('/', getCommunities);
router.get('/my', getMyCommunities);
router.get('/:id', getCommunity);
router.patch('/:id', updateCommunity);
router.delete('/:id', deleteCommunity);

// Community threads
router.get('/:id/threads', getCommunityThreads);
router.post('/:id/threads/:threadId/pin', pinThread);

// Membership
router.post('/:id/join', joinCommunity);
router.post('/:id/leave', leaveCommunity);
router.get('/:id/members', getMembers);

// Member management (admin only)
router.patch('/:id/members/:userId/role', updateMemberRole);
router.delete('/:id/members/:userId', kickMember);
router.post('/:id/members/:userId/ban', banMember);
router.delete('/:id/members/:userId/ban', unbanMember);

export default router;
