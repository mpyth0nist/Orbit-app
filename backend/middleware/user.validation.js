/**
 * User-specific Validation Middleware
 * 
 * Additional validation schemas for user controller endpoints
 * beyond the generic validation in middleware/validation.js
 * 
 * @module middleware/user.validation
 */

import Joi from 'joi';
import { validate } from './validation.js';

// ============================================================================
// Parameter Validation Schemas
// ============================================================================

/**
 * User ID parameter validation schema
 */
export const userIdParamSchema = Joi.object({
    userId: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'User ID must be a number',
            'number.positive': 'User ID must be a positive number',
            'any.required': 'User ID is required'
        })
});

/**
 * Follower ID parameter validation schema
 */
export const followerIdParamSchema = Joi.object({
    follower: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Follower ID must be a number',
            'number.positive': 'Follower ID must be a positive number',
            'any.required': 'Follower ID is required'
        })
});

/**
 * Followed ID parameter validation schema
 */
export const followedIdParamSchema = Joi.object({
    followed: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Followed ID must be a number',
            'number.positive': 'Followed ID must be a positive number',
            'any.required': 'Followed ID is required'
        })
});

// ============================================================================
// Request Body Validation Schemas
// ============================================================================

/**
 * Update follow request validation schema
 */
export const updateFollowRequestSchema = Joi.object({
    isAccepted: Joi.boolean()
        .required()
        .messages({
            'boolean.base': 'isAccepted must be a boolean',
            'any.required': 'isAccepted is required'
        })
});

// ============================================================================
// Middleware Exports
// ============================================================================

/**
 * Pre-configured validation middleware for user routes
 */
export const validateUserId = validate(userIdParamSchema, 'params');
export const validateFollowerId = validate(followerIdParamSchema, 'params');
export const validateFollowedId = validate(followedIdParamSchema, 'params');
export const validateUpdateFollowRequest = validate(updateFollowRequestSchema);
