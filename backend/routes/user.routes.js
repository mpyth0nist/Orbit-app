/**
 * User Routes
 * 
 * Handles user profile, follow system, and thread management endpoints
 * with proper validation and protection middleware.
 * 
 * @module routes/user
 */

import express from "express";
import protect from "../middleware/protect.js";
import {
    follow,
    getFollowed,
    getFollowers,
    getMyInfo,
    updateMyInfo,
    getUser,
    unfollow,
    removeFollower,
    updateRequest,
    getMyThreads,
    updateProfile,
    updateProfilePicture,
    getPendingFollowRequests,
    searchUsers,
    getUserStats,
    checkRelationship,
    getUserByUsername
} from "../controllers/user.controller.js";
import {
    validateUpdateUser,
    validateUpdateProfile,
    validateUpdateProfilePicture,
    validatePagination,
    validateSearchQuery
} from "../middleware/validation.js";
import {
    validateUserId,
    validateFollowerId,
    validateFollowedId,
    validateUpdateFollowRequest
} from "../middleware/user.validation.js";

const router = express.Router();

// ============================================================================
// Current User Routes
// ============================================================================

/**
 * @route   GET /api/user/
 * @desc    Get current user info
 * @access  Private
 */
router.get("/", protect, getMyInfo);

/**
 * @route   PATCH /api/user/
 * @desc    Update current user info
 * @access  Private
 */
router.patch("/", protect, validateUpdateUser, updateMyInfo);

/**
 * @route   GET /api/user/stats
 * @desc    Get current user's statistics (followers, following, threads counts)
 * @access  Private
 */
router.get("/stats", protect, getUserStats);

/**
 * @route   GET /api/user/search
 * @desc    Search for users by username or name
 * @access  Private
 */
router.get("/search", protect, validateSearchQuery, searchUsers);

// ============================================================================
// Profile Management
// ============================================================================

/**
 * @route   PATCH /api/user/profile
 * @desc    Update user profile (bio, name, gender)
 * @access  Private
 */
router.patch("/profile", protect, validateUpdateProfile, updateProfile);

/**
 * @route   PATCH /api/user/profile/picture
 * @desc    Update profile picture
 * @access  Private
 */
router.patch("/profile/picture", protect, validateUpdateProfilePicture, updateProfilePicture);

// ============================================================================
// Threads
// ============================================================================

/**
 * @route   GET /api/user/threads
 * @desc    Get current user's threads
 * @access  Private
 */
router.get("/threads", protect, validatePagination, getMyThreads);

// ============================================================================
// Follow System
// ============================================================================

/**
 * @route   POST /api/user/follow/:followed
 * @desc    Follow a user
 * @access  Private
 */
router.post("/follow/:followed", protect, validateFollowedId, follow);

/**
 * @route   DELETE /api/user/follow/:followed
 * @desc    Unfollow a user
 * @access  Private
 */
router.delete("/follow/:followed", protect, validateFollowedId, unfollow);

/**
 * @route   GET /api/user/followers
 * @desc    Get current user's followers
 * @access  Private
 */
router.get("/followers", protect, validatePagination, getFollowers);

/**
 * @route   DELETE /api/user/followers/:follower
 * @desc    Remove a follower
 * @access  Private
 */
router.delete("/followers/:follower", protect, validateFollowerId, removeFollower);

/**
 * @route   GET /api/user/following
 * @desc    Get users that current user follows
 * @access  Private
 */
router.get("/following", protect, validatePagination, getFollowed);

/**
 * @route   PATCH /api/user/follow-requests/:follower
 * @desc    Accept or reject a follow request
 * @access  Private
 */
router.patch("/follow-requests/:follower", protect, validateFollowerId, validateUpdateFollowRequest, updateRequest);

/**
 * @route   GET /api/user/follow-requests
 * @desc    Get pending follow requests for current user
 * @access  Private
 */
router.get("/follow-requests", protect, validatePagination, getPendingFollowRequests);

// ============================================================================
// Specific User Route (Keep last to avoid route conflicts)
// ============================================================================

/**
 * @route   GET /api/user/username/:username
 * @desc    Get user by username
 * @access  Private
 */
router.get("/username/:username", protect, getUserByUsername);

/**
 * @route   GET /api/user/:userId/relationship
 * @desc    Check relationship with another user
 * @access  Private
 */
router.get("/:userId/relationship", protect, validateUserId, checkRelationship);

/**
 * @route   GET /api/user/:userId
 * @desc    Get user by ID
 * @access  Private
 */
router.get("/:userId", protect, validateUserId, getUser);

export default router;
