import { prisma } from '../setup.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Create a test user with valid credentials
 */
export async function createTestUser(overrides = {}) {
    const defaultUser = {
        username: `testuser${Date.now()}`,
        email: `test${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash('TestPassword123', 10),
        type: 'PUBLIC',
    };

    const userData = { ...defaultUser, ...overrides };

    const user = await prisma.user.create({
        data: {
            ...userData,
            profile: {
                create: {
                    firstName: overrides.firstName || 'Test',
                    lastName: overrides.lastName || 'User',
                    bio: overrides.bio || 'Test bio',
                    gender: overrides.gender || 'MALE',
                },
            },
        },
        include: {
            profile: true,
        },
    });

    return user;
}

/**
 * Generate JWT token for a user
 */
export function getAuthToken(userId) {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
    );
}

/**
 * Create a test thread
 */
export async function createTestThread(userId, content = 'Test thread content') {
    return await prisma.thread.create({
        data: {
            userId,
            content,
        },
        include: {
            user: {
                include: {
                    profile: true,
                },
            },
        },
    });
}

/**
 * Create a test comment
 */
export async function createTestComment(userId, threadId, content = 'Test comment') {
    return await prisma.comment.create({
        data: {
            userId,
            threadId,
            content,
        },
    });
}

/**
 * Clear all data from database
 */
export async function clearDatabase() {
    const tables = [
        'Notification',
        'Reaction',
        'Comment',
        'Media',
        'Thread',
        'Follow',
        'Profile',
        'User',
    ];

    for (const table of tables) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE;`);
    }
}
