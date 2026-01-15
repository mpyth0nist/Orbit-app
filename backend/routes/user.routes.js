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
    updateProfilePicture
} from "../controllers/user.controller.js";
import {
    validateUpdateUser,
    validateUpdateProfile,
    validateUpdateProfilePicture,
    validateIdParam
} from "../middleware/validation.js";

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
router.get("/threads", protect, getMyThreads);

// ============================================================================
// Follow System
// ============================================================================

/**
 * @route   POST /api/user/follow/:followed
 * @desc    Follow a user
 * @access  Private
 */
router.post("/follow/:followed", protect, follow);

/**
 * @route   DELETE /api/user/follow/:followed
 * @desc    Unfollow a user
 * @access  Private
 */
router.delete("/follow/:followed", protect, unfollow);

/**
 * @route   GET /api/user/followers
 * @desc    Get current user's followers
 * @access  Private
 */
router.get("/followers", protect, getFollowers);

/**
 * @route   DELETE /api/user/followers/:follower
 * @desc    Remove a follower
 * @access  Private
 */
router.delete("/followers/:follower", protect, removeFollower);

/**
 * @route   GET /api/user/following
 * @desc    Get users that current user follows
 * @access  Private
 */
router.get("/following", protect, getFollowed);

/**
 * @route   PATCH /api/user/follow-requests/:follower
 * @desc    Accept or reject a follow request
 * @access  Private
 */
router.patch("/follow-requests/:follower", protect, updateRequest);

// ============================================================================
// Specific User Route (Keep last to avoid route conflicts)
// ============================================================================

/**
 * @route   GET /api/user/:userId
 * @desc    Get user by ID
 * @access  Private
 */
router.get("/:userId", protect, getUser);

export default router;
