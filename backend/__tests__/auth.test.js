import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';
import { prisma } from './setup.js';
import bcrypt from 'bcrypt';

describe('Authentication API', () => {
    describe('POST /api/auth/register', () => {
        test('should register a new user with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'newuser',
                    email: 'newuser@test.com',
                    password: 'SecurePass123',
                    firstName: 'New',
                    lastName: 'User',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.data.user).toHaveProperty('id');
            expect(response.body.data.user.email).toBe('newuser@test.com');

            // Verify user was created in database
            const user = await prisma.user.findUnique({
                where: { email: 'newuser@test.com' },
            });
            expect(user).toBeTruthy();
        });

        test('should reject registration with duplicate email', async () => {
            // Create first user
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'user1',
                    email: 'duplicate@test.com',
                    password: 'SecurePass123',
                    firstName: 'First',
                    lastName: 'User',
                });

            // Try to create second user with same email
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'user2',
                    email: 'duplicate@test.com',
                    password: 'SecurePass123',
                    firstName: 'Second',
                    lastName: 'User',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should reject registration with invalid email', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'invalid-email',
                    password: 'SecurePass123',
                    firstName: 'Test',
                    lastName: 'User',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('should reject registration with weak password', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@test.com',
                    password: 'weak',
                    firstName: 'Test',
                    lastName: 'User',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/login', () => {
        test('should login with valid credentials', async () => {
            // Create a user first
            const password = 'TestPassword123';
            const hashedPassword = await bcrypt.hash(password, 10);

            await prisma.user.create({
                data: {
                    username: 'loginuser',
                    email: 'login@test.com',
                    passwordHash: hashedPassword,
                    profile: {
                        create: {
                            firstName: 'Login',
                            lastName: 'User',
                            gender: 'MALE',
                        },
                    },
                },
            });

            // Try to login
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'login@test.com',
                    password: password,
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.data.user.email).toBe('login@test.com');
        });

        test('should reject login with wrong password', async () => {
            const password = 'CorrectPassword123';
            const hashedPassword = await bcrypt.hash(password, 10);

            await prisma.user.create({
                data: {
                    username: 'wrongpass',
                    email: 'wrongpass@test.com',
                    passwordHash: hashedPassword,
                    profile: {
                        create: {
                            firstName: 'Wrong',
                            lastName: 'Pass',
                            gender: 'MALE',
                        },
                    },
                },
            });

            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'wrongpass@test.com',
                    password: 'WrongPassword123',
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        test('should reject login with non-existent email', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'SomePassword123',
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
