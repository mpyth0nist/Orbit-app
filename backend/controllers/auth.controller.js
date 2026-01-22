import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { successResponse, errorResponse, createdResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import {
    hashPassword,
    comparePassword,
    generateAccessToken,
    checkUserExists
} from '../utils/authService.js';

// Register a new user
export const register = asyncHandler(async (req, res) => {
    const { firstName, lastName, username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await checkUserExists(username, email);

    if (existingUser) {
        logger.warn('Registration failed - user exists', {
            attemptedUsername: username,
            attemptedEmail: email
        });
        return errorResponse(res, 'Username or email already exists', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with profile
    const newUser = await prisma.user.create({
        data: {
            username,
            email,
            passwordHash: hashedPassword,
            profile: {
                create: {
                    firstName,
                    lastName
                }
            }
        },
        select: {
            id: true,
            username: true,
            email: true,
            type: true,
            profile: {
                select: {
                    firstName: true,
                    lastName: true
                }
            }
        }
    });

    // Generate access token
    const token = generateAccessToken(newUser.id, newUser.email);

    logger.info('User registered successfully', {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email
    });

    return createdResponse(
        res,
        {
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                type: newUser.type,
                firstName: newUser.profile.firstName,
                lastName: newUser.profile.lastName
            },
            token
        },
        'Registration successful'
    );
});

// Login user
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            username: true,
            email: true,
            type: true,
            passwordHash: true,
            profile: {
                select: {
                    firstName: true,
                    lastName: true,
                    photoUrl: true
                }
            }
        }
    });

    // Check if user exists
    if (!user) {
        logger.warn('Login failed - user not found', { email });
        return errorResponse(res, 'Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
        logger.warn('Login failed - invalid password', {
            userId: user.id,
            email
        });
        return errorResponse(res, 'Invalid email or password', 401);
    }

    // Generate access token
    const token = generateAccessToken(user.id, user.email);

    logger.info('User logged in successfully', {
        userId: user.id,
        username: user.username,
        email: user.email
    });

    // Remove passwordHash from response
    const { passwordHash, ...userWithoutPassword } = user;

    return successResponse(
        res,
        {
            user: {
                id: userWithoutPassword.id,
                username: userWithoutPassword.username,
                email: userWithoutPassword.email,
                type: userWithoutPassword.type,
                firstName: userWithoutPassword.profile?.firstName,
                lastName: userWithoutPassword.profile?.lastName,
                photoUrl: userWithoutPassword.profile?.photoUrl
            },
            token
        },
        'Login successful'
    );
});