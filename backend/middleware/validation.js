/**
 * Request Validation Middleware
 * 
 * Provides Joi schema validation for request bodies, query params, and URL params.
 * Ensures data integrity and prevents invalid data from reaching controllers.
 * 
 * @module middleware/validation
 */

import Joi from 'joi';

/**
 * Generic validation middleware factory
 * 
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
export const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false, // Return all errors, not just the first
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message.replace(/['"]/g, '')
                }))
            });
        }

        // Merge validated values into request property (don't replace the object)
        if (property === 'query' || property === 'params') {
            Object.assign(req[property], value);
        } else {
            req[property] = value;
        }
        next();
    };
};

// ============================================================================
// Authentication Validation Schemas
// ============================================================================

/**
 * User registration validation schema
 */
export const registerSchema = Joi.object({
    firstName: Joi.string()
        .min(2)
        .max(50)
        .trim()
        .required()
        .messages({
            'string.min': 'First name must be at least 2 characters',
            'string.max': 'First name cannot exceed 50 characters',
            'any.required': 'First name is required'
        }),

    lastName: Joi.string()
        .min(2)
        .max(50)
        .trim()
        .required()
        .messages({
            'string.min': 'Last name must be at least 2 characters',
            'string.max': 'Last name cannot exceed 50 characters',
            'any.required': 'Last name is required'
        }),

    username: Joi.string()
        .alphanum()
        .min(3)
        .max(30)
        .trim()
        .lowercase()
        .required()
        .messages({
            'string.alphanum': 'Username must contain only letters and numbers',
            'string.min': 'Username must be at least 3 characters',
            'string.max': 'Username cannot exceed 30 characters',
            'any.required': 'Username is required'
        }),

    email: Joi.string()
        .email()
        .trim()
        .lowercase()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            'any.required': 'Password is required'
        })
});

/**
 * User login validation schema
 */
export const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .trim()
        .lowercase()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required'
        })
});

// ============================================================================
// User Profile Validation Schemas
// ============================================================================

/**
 * Update user account info validation schema (email, username, type)
 * Profile fields are updated via updateProfile endpoint
 */
export const updateUserSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).trim().lowercase().optional(),
    email: Joi.string().email().trim().lowercase().optional(),
    type: Joi.string().valid('PUBLIC', 'PRIVATE').optional(),
    notificationsEnabled: Joi.boolean().optional()
}).min(1); // At least one field required

/**
 * Update profile validation schema
 */
export const updateProfileSchema = Joi.object({
    firstName: Joi.string().min(2).max(50).trim().optional(),
    lastName: Joi.string().min(2).max(50).trim().optional(),
    bio: Joi.string().max(500).trim().allow('', null).optional()
}).min(1);

/**
 * Update profile picture validation schema
 */
export const updateProfilePictureSchema = Joi.object({
    photoUrl: Joi.string()
        .uri()
        .required()
        .messages({
            'string.uri': 'Please provide a valid URL',
            'any.required': 'Photo URL is required'
        })
});

/**
 * Update profile banner validation schema
 */
export const updateProfileBannerSchema = Joi.object({
    coverUrl: Joi.string()
        .uri()
        .required()
        .messages({
            'string.uri': 'Please provide a valid URL',
            'any.required': 'Cover URL is required'
        })
});

// ============================================================================
// Thread Validation Schemas
// ============================================================================

/**
 * Create thread validation schema
 */
export const createThreadSchema = Joi.object({
    content: Joi.string()
        .min(1)
        .max(500)
        .trim()
        .required()
        .messages({
            'string.min': 'Thread content cannot be empty',
            'string.max': 'Thread content cannot exceed 500 characters',
            'any.required': 'Thread content is required'
        }),

    mediaUrls: Joi.array()
        .items(Joi.string().uri())
        .max(4)
        .optional()
        .messages({
            'array.max': 'You can attach up to 4 media files'
        }),

    repostId: Joi.alternatives()
        .try(Joi.number(), Joi.string())
        .optional()
        .messages({
            'number.base': 'Repost ID must be a number',
            'string.base': 'Repost ID must be a valid ID'
        }),

    communityId: Joi.alternatives()
        .try(Joi.number(), Joi.string())
        .optional()
        .messages({
            'string.base': 'Community ID must be a valid ID'
        }),

    threadType: Joi.string()
        .valid('NORMAL', 'HELP')
        .optional()
        .messages({
            'any.only': 'Thread type must be either NORMAL or HELP'
        })
});

/**
 * Update thread validation schema
 */
export const updateThreadSchema = Joi.object({
    content: Joi.string()
        .min(1)
        .max(500)
        .trim()
        .required()
        .messages({
            'string.min': 'Thread content cannot be empty',
            'string.max': 'Thread content cannot exceed 500 characters',
            'any.required': 'Thread content is required'
        })
});

// ============================================================================
// Comment Validation Schemas
// ============================================================================

/**
 * Create comment validation schema
 */
export const createCommentSchema = Joi.object({
    content: Joi.string()
        .min(1)
        .max(300)
        .trim()
        .required()
        .messages({
            'string.min': 'Comment cannot be empty',
            'string.max': 'Comment cannot exceed 300 characters',
            'any.required': 'Comment content is required'
        }),

    parentId: Joi.number()
        .integer()
        .positive()
        .optional()
        .messages({
            'number.base': 'Parent ID must be a number',
            'number.positive': 'Parent ID must be positive'
        })
});

/**
 * Update comment validation schema
 */
export const updateCommentSchema = Joi.object({
    content: Joi.string()
        .min(1)
        .max(300)
        .trim()
        .required()
        .messages({
            'string.min': 'Comment cannot be empty',
            'string.max': 'Comment cannot exceed 300 characters',
            'any.required': 'Comment content is required'
        })
});

// ============================================================================
// Pagination & Query Validation Schemas
// ============================================================================

/**
 * Pagination query validation schema
 */
export const paginationSchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1)
        .optional(),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(20)
        .optional()
});

/**
 * ID parameter validation schema
 */
export const idParamSchema = Joi.object({
    id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'ID must be a number',
            'number.positive': 'ID must be positive',
            'any.required': 'ID is required'
        })
});

/**
 * User search query validation schema
 */
export const searchQuerySchema = Joi.object({
    q: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .required()
        .messages({
            'string.min': 'Search term must be at least 2 characters',
            'string.max': 'Search term cannot exceed 100 characters',
            'any.required': 'Search term is required'
        }),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(50).optional()
});

/**
 * Thread search query validation schema
 */
export const searchThreadsSchema = Joi.object({
    q: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .required()
        .messages({
            'string.min': 'Search term must be at least 2 characters',
            'string.max': 'Search term cannot exceed 100 characters',
            'any.required': 'Search term is required'
        }),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional()
});

// ============================================================================
// Notification Validation Schemas
// ============================================================================

/**
 * Update notification validation schema (mark as read/unread)
 */
export const updateNotificationSchema = Joi.object({
    isRead: Joi.boolean()
        .required()
        .messages({
            'boolean.base': 'isRead must be a boolean value',
            'any.required': 'isRead is required'
        })
});

/**
 * Notification query validation schema
 */
export const notificationQuerySchema = Joi.object({
    filter: Joi.string()
        .valid('all', 'read', 'unread', 'like', 'comment', 'follow', 'repost')
        .optional()
        .default('all')
        .messages({
            'any.only': 'Filter must be one of: all, read, unread, like, comment, follow, repost'
        }),
    cursor: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional()
});

// ============================================================================
// Community Validation Schemas
// ============================================================================

/**
 * Create community validation schema
 */
export const createCommunitySchema = Joi.object({
    name: Joi.string()
        .min(3)
        .max(100)
        .trim()
        .required()
        .messages({
            'string.min': 'Community name must be at least 3 characters',
            'string.max': 'Community name cannot exceed 100 characters',
            'any.required': 'Community name is required'
        }),

    description: Joi.string()
        .max(500)
        .trim()
        .allow('', null)
        .optional()
        .messages({
            'string.max': 'Description cannot exceed 500 characters'
        })
});

/**
 * Update community validation schema
 */
export const updateCommunitySchema = Joi.object({
    name: Joi.string()
        .min(3)
        .max(100)
        .trim()
        .optional()
        .messages({
            'string.min': 'Community name must be at least 3 characters',
            'string.max': 'Community name cannot exceed 100 characters'
        }),

    description: Joi.string()
        .max(500)
        .trim()
        .allow('', null)
        .optional()
        .messages({
            'string.max': 'Description cannot exceed 500 characters'
        }),

    photoUrl: Joi.string()
        .uri()
        .allow('', null)
        .optional()
        .messages({
            'string.uri': 'Photo URL must be a valid URL'
        })
}).min(1); // At least one field required

/**
 * Update member role validation schema
 */
export const updateMemberRoleSchema = Joi.object({
    role: Joi.string()
        .valid('ADMIN', 'MODERATOR', 'MEMBER')
        .required()
        .messages({
            'any.only': 'Role must be either ADMIN or MEMBER',
            'any.required': 'Role is required'
        })
});

// ============================================================================
// Middleware Exports
// ============================================================================

/**
 * Pre-configured validation middleware for common use cases
 */
export const validateRegister = validate(registerSchema);
export const validateLogin = validate(loginSchema);
export const validateUpdateUser = validate(updateUserSchema);
export const validateUpdateProfile = validate(updateProfileSchema);
export const validateUpdateProfilePicture = validate(updateProfilePictureSchema);
export const validateUpdateProfileBanner = validate(updateProfileBannerSchema);
export const validateCreateThread = validate(createThreadSchema);
export const validateUpdateThread = validate(updateThreadSchema);
export const validateCreateComment = validate(createCommentSchema);
export const validateUpdateComment = validate(updateCommentSchema);
export const validatePagination = validate(paginationSchema, 'query');
export const validateIdParam = validate(idParamSchema, 'params');
export const validateSearchQuery = validate(searchQuerySchema, 'query');
export const validateSearchThreads = validate(searchThreadsSchema, 'query');
export const validateUpdateNotification = validate(updateNotificationSchema);
export const validateNotificationQuery = validate(notificationQuerySchema, 'query');
export const validateCreateCommunity = validate(createCommunitySchema);
export const validateUpdateCommunity = validate(updateCommunitySchema);
export const validateUpdateMemberRole = validate(updateMemberRoleSchema);
