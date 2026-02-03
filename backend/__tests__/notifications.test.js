import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';
import { createTestUser, getAuthToken, createTestThread } from './helpers/testUtils.js';
import { prisma } from './setup.js';

describe('Notifications API', () => {
    describe('GET /api/notifications', () => {
        test('should get user notifications', async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser({ email: 'user2@test.com', username: 'user2' });
            const token = getAuthToken(user1.id);

            // Create a notification (e.g., user2 likes user1's thread)
            const thread = await createTestThread(user1.id);

            await prisma.notification.create({
                data: {
                    actorId: user2.id,
                    receiverId: user1.id,
                    entityId: thread.id,
                    entityType: 'THREAD',
                    type: 'LIKE',
                },
            });

            const response = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        test('should reject request without authentication', async () => {
            const response = await request(app)
                .get('/api/notifications');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/notifications/unread-count', () => {
        test('should get unread notification count', async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser({ email: 'user2@test.com', username: 'user2' });
            const token = getAuthToken(user1.id);

            // Create unread notifications
            await prisma.notification.createMany({
                data: [
                    {
                        actorId: user2.id,
                        receiverId: user1.id,
                        type: 'LIKE',
                        isRead: false,
                    },
                    {
                        actorId: user2.id,
                        receiverId: user1.id,
                        type: 'COMMENT',
                        isRead: false,
                    },
                ],
            });

            const response = await request(app)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.count).toBe(2);
        });

        test('should return 0 for no unread notifications', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);

            const response = await request(app)
                .get('/api/notifications/unread-count')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data.count).toBe(0);
        });
    });

    describe('PATCH /api/notifications/mark-all-read', () => {
        test('should mark all notifications as read', async () => {
            const user1 = await createTestUser();
            const user2 = await createTestUser({ email: 'user2@test.com', username: 'user2' });
            const token = getAuthToken(user1.id);

            // Create unread notifications
            await prisma.notification.createMany({
                data: [
                    {
                        actorId: user2.id,
                        receiverId: user1.id,
                        type: 'LIKE',
                        isRead: false,
                    },
                    {
                        actorId: user2.id,
                        receiverId: user1.id,
                        type: 'COMMENT',
                        isRead: false,
                    },
                ],
            });

            const response = await request(app)
                .patch('/api/notifications/mark-all-read')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify all were marked as read
            const unreadCount = await prisma.notification.count({
                where: {
                    receiverId: user1.id,
                    isRead: false,
                },
            });
            expect(unreadCount).toBe(0);
        });
    });

    describe('Notification creation on actions', () => {
        test('should create notification when thread is liked', async () => {
            const owner = await createTestUser();
            const liker = await createTestUser({ email: 'liker@test.com', username: 'liker' });
            const token = getAuthToken(liker.id);
            const thread = await createTestThread(owner.id);

            // Like the thread
            await request(app)
                .post(`/api/reactions/thread/${thread.id}`)
                .set('Authorization', `Bearer ${token}`);

            // Check if notification was created
            const notification = await prisma.notification.findFirst({
                where: {
                    actorId: liker.id,
                    receiverId: owner.id,
                    type: 'LIKE',
                },
            });

            expect(notification).toBeTruthy();
        });

        test('should create notification when comment is added', async () => {
            const threadOwner = await createTestUser();
            const commenter = await createTestUser({ email: 'commenter@test.com', username: 'commenter' });
            const token = getAuthToken(commenter.id);
            const thread = await createTestThread(threadOwner.id);

            // Add comment
            await request(app)
                .post(`/api/threads/${thread.id}/comments`)
                .set('Authorization', `Bearer ${token}`)
                .send({ content: 'Great post!' });

            // Check if notification was created
            const notification = await prisma.notification.findFirst({
                where: {
                    actorId: commenter.id,
                    receiverId: threadOwner.id,
                    type: 'COMMENT',
                },
            });

            expect(notification).toBeTruthy();
        });
    });
});
