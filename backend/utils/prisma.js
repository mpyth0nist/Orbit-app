/**
 * Prisma Client Singleton
 * 
 * Provides a single, reusable Prisma Client instance across the application.
 * Prevents creating multiple database connections and improves performance.
 * 
 * In development, stores the client in global to prevent hot-reloading issues.
 * In production, creates a single instance.
 * 
 * @module utils/prisma
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = global;

/**
 * Prisma Client instance with logging configuration
 * 
 * Logs:
 * - Development: All queries, warnings, and errors
 * - Production: Only errors
 */
export const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error']
});

// Store in global in development to prevent multiple instances during hot-reload
if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect from database on application shutdown
 */
export const disconnectPrisma = async () => {
    await prisma.$disconnect();
};

/**
 * Common select objects for user data
 * Prevents accidentally exposing sensitive fields like passwordHash
 */
export const selectUser = {
    id: true,
    username: true,
    email: true,
    type: true,
    createdAt: true,
    updatedAt: true,
    profile: {
        select: {
            firstName: true,
            lastName: true,
            bio: true,
            photoUrl: true
        }
    }
    // passwordHash is explicitly NOT included
};

/**
 * Select object for public user profile
 * Hides sensitive information like email
 */
export const selectPublicUser = {
    id: true,
    username: true,
    type: true,
    profile: {
        select: {
            firstName: true,
            lastName: true,
            bio: true,
            photoUrl: true
        }
    }
    // email and passwordHash are NOT included
};

/**
 * Select object for full user profile including stats
 */
export const selectUserProfile = {
    ...selectPublicUser,
    _count: {
        select: {
            followers: { where: { status: 'ACCEPTED' } },
            following: { where: { status: 'ACCEPTED' } },
            threads: true
        }
    }
};

/**
 * Select object for thread with user info
 */
export const selectThreadWithUser = {
    id: true,
    content: true,
    likesCount: true,
    commentsCount: true,
    createdAt: true,
    updatedAt: true,
    user: {
        select: selectPublicUser
    },
    media: {
        select: {
            id: true,
            url: true,
            type: true
        }
    }
};
