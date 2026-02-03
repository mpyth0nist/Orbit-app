import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';
import { createTestUser, getAuthToken } from './helpers/testUtils.js';
import { prisma } from './setup.js';

describe('Users & Follows API', () => {
    describe('GET /api/user/:id', () => {
        test('should get user profile by ID', async () => {
            const user = await createTestUser();

            const response = await request(app)
                .get(`/api/user/${user.id}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(user.id);
            expect(response.body.data).toHaveProperty('profile');
        });

        test('should return 404 for non-existent user', async () => {
            const response = await request(app)
                .get('/api/user/99999');

            expect(response.status).toBe(404);
        });

        test('should include follower/following counts', async () => {
            const user = await createTestUser();

            const response = await request(app)
                .get(`/api/user/${user.id}`);

            expect(response.status).toBe(200);
            expect(response.body.data._count).toHaveProperty('followers');
            expect(response.body.data._count).toHaveProperty('following');
        });
    });

    describe('POST /api/user/follow/:id', () => {
        test('should follow a user', async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser({ email: 'user2@test.com', username: 'user2' });
            const token = getAuthToken(user1.id);

            const response = await request(app)
                .post(`/api/user/follow/${user2.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify follow relationship was created
            const follow = await prisma.follow.findFirst({
                where: {
                    followerId: user1.id,
                    followedId: user2.id,
                },
            });
            expect(follow).toBeTruthy();
        });

        test('should reject following without authentication', async () => {
            const user = await createTestUser();

            const response = await request(app)
                .post(`/api/user/follow/${user.id}`);

            expect(response.status).toBe(401);
        });

        test('should reject following yourself', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);

            const response = await request(app)
                .post(`/api/user/follow/${user.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(400);
        });
    });

    describe('DELETE /api/user/follow/:id', () => {
        test('should unfollow a user', async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser({ email: 'user2@test.com', username: 'user2' });
            const token = getAuthToken(user1.id);

            // First follow
            await prisma.follow.create({
                data: {
                    followerId: user1.id,
                    followedId: user2.id,
                },
            });

            // Then unfollow
            const response = await request(app)
                .delete(`/api/user/follow/${user2.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify follow relationship was removed
            const follow = await prisma.follow.findFirst({
                where: {
                    followerId: user1.id,
                    followedId: user2.id,
                },
            });
            expect(follow).toBeNull();
        });
    });

    describe('GET /api/user/followers', () => {
        test('should get user followers list', async () => {
            const user = await createTestUser();
            const follower1 = await createTestUser({ email: 'f1@test.com', username: 'follower1' });
            const follower2 = await createTestUser({ email: 'f2@test.com', username: 'follower2' });
            const token = getAuthToken(user.id);

            // Create follow relationships
            await prisma.follow.createMany({
                data: [
                    { followerId: follower1.id, followedId: user.id },
                    { followerId: follower2.id, followedId: user.id },
                ],
            });

            const response = await request(app)
                .get('/api/user/followers')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBe(2);
        });
    });

    describe('GET /api/user/following', () => {
        test('should get users that current user is following', async () => {
            const user = await createTestUser();
            const followed1 = await createTestUser({ email: 'f1@test.com', username: 'followed1' });
            const followed2 = await createTestUser({ email: 'f2@test.com', username: 'followed2' });
            const token = getAuthToken(user.id);

            // Create follow relationships
            await prisma.follow.createMany({
                data: [
                    { followerId: user.id, followedId: followed1.id },
                    { followerId: user.id, followedId: followed2.id },
                ],
            });

            const response = await request(app)
                .get('/api/user/following')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBe(2);
        });
    });
});
