import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';
import { createTestUser, getAuthToken, createTestThread } from './helpers/testUtils.js';

describe('Threads API', () => {
    describe('POST /api/threads', () => {
        test('should create a thread with authentication', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);

            const response = await request(app)
                .post('/api/threads')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    content: 'This is a test thread',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.content).toBe('This is a test thread');
            expect(response.body.data.userId).toBe(user.id);
        });

        test('should reject thread creation without authentication', async () => {
            const response = await request(app)
                .post('/api/threads')
                .send({
                    content: 'This should fail',
                });

            expect(response.status).toBe(401);
        });

        test('should reject thread with empty content', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);

            const response = await request(app)
                .post('/api/threads')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    content: '',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/threads/:id', () => {
        test('should get a single thread by ID', async () => {
            const user = await createTestUser();
            const thread = await createTestThread(user.id, 'Test thread content');

            const response = await request(app)
                .get(`/api/threads/${thread.id}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe(thread.id);
            expect(response.body.data.content).toBe('Test thread content');
        });

        test('should return 404 for non-existent thread', async () => {
            const response = await request(app)
                .get('/api/threads/99999');

            expect(response.status).toBe(404);
        });
    });

    describe('GET /api/threads/feed', () => {
        test('should return feed for authenticated user', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);

            // Create some threads
            await createTestThread(user.id, 'Thread 1');
            await createTestThread(user.id, 'Thread 2');

            const response = await request(app)
                .get('/api/threads/feed')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        test('should reject feed request without authentication', async () => {
            const response = await request(app)
                .get('/api/threads/feed');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/threads/trending', () => {
        test('should return trending threads', async () => {
            const response = await request(app)
                .get('/api/threads/trending');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
    });

    describe('PATCH /api/threads/:id', () => {
        test('should update thread when user is owner', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);
            const thread = await createTestThread(user.id, 'Original content');

            const response = await request(app)
                .patch(`/api/threads/${thread.id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    content: 'Updated content',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.content).toBe('Updated content');
        });

        test('should reject update when user is not owner', async () => {
            const owner = await createTestUser();
            const otherUser = await createTestUser({ email: 'other@test.com', username: 'otheruser' });
            const token = getAuthToken(otherUser.id);
            const thread = await createTestThread(owner.id, 'Owner thread');

            const response = await request(app)
                .patch(`/api/threads/${thread.id}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    content: 'Hacked content',
                });

            expect(response.status).toBe(403);
        });
    });

    describe('DELETE /api/threads/:id', () => {
        test('should delete thread when user is owner', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);
            const thread = await createTestThread(user.id);

            const response = await request(app)
                .delete(`/api/threads/${thread.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify thread is deleted
            const getResponse = await request(app)
                .get(`/api/threads/${thread.id}`);
            expect(getResponse.status).toBe(404);
        });

        test('should reject deletion when user is not owner', async () => {
            const owner = await createTestUser();
            const otherUser = await createTestUser({ email: 'other@test.com', username: 'otheruser' });
            const token = getAuthToken(otherUser.id);
            const thread = await createTestThread(owner.id);

            const response = await request(app)
                .delete(`/api/threads/${thread.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
        });
    });
});
