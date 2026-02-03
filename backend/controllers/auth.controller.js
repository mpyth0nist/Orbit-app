import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { successResponse, errorResponse, createdResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import validator from 'validator';
import {
    hashPassword,
    comparePassword,
    generateAccessToken,
    checkUserExists
} from '../utils/authService.js';

// Validation constants
const PASSWORD_MIN_LENGTH = 8;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

// Register a new user
export const register = asyncHandler(async (req, res) => {
    const { firstName, lastName, username, email, password } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !email || !password) {
        return errorResponse(res, 'All fields are required: firstName, lastName, username, email, password', 400);
    }

    // Validate email format
    if (!validator.isEmail(email)) {
        return errorResponse(res, 'Invalid email format', 400);
    }

    // Validate username
    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername.length < USERNAME_MIN_LENGTH || trimmedUsername.length > USERNAME_MAX_LENGTH) {
        return errorResponse(res, `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters`, 400);
    }
    if (!USERNAME_REGEX.test(trimmedUsername)) {
        return errorResponse(res, 'Username can only contain letters, numbers, and underscores', 400);
    }

    // Validate password strength
    if (password.length < PASSWORD_MIN_LENGTH) {
        return errorResponse(res, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`, 400);
    }

    // Validate names
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (trimmedFirstName.length === 0 || trimmedLastName.length === 0) {
        return errorResponse(res, 'First name and last name cannot be empty', 400);
    }
    if (trimmedFirstName.length > 100 || trimmedLastName.length > 100) {
        return errorResponse(res, 'First name and last name cannot exceed 100 characters', 400);
    }

    // Validate email length
    if (email.length > 100) {
        return errorResponse(res, 'Email cannot exceed 100 characters', 400);
    }

    // Check if user already exists
    const existingUser = await checkUserExists(trimmedUsername, email.toLowerCase());

    if (existingUser) {
        logger.warn('Registration failed - user exists', {
            attemptedUsername: trimmedUsername
        });
        return errorResponse(res, 'Username or email already exists', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with profile
    const newUser = await prisma.user.create({
        data: {
            username: trimmedUsername,
            email: email.toLowerCase(),
            passwordHash: hashedPassword,
            profile: {
                create: {
                    firstName: trimmedFirstName,
                    lastName: trimmedLastName
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

    // Validate required fields
    if (!email || !password) {
        return errorResponse(res, 'Email and password are required', 400);
    }

    // Validate email format
    if (!validator.isEmail(email)) {
        return errorResponse(res, 'Invalid email format', 400);
    }

    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
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
        logger.warn('Login failed - user not found');
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