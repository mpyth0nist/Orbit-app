import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';
import { createTestUser, getAuthToken, createTestThread, createTestComment } from './helpers/testUtils.js';

describe('Comments API', () => {
    describe('POST /api/threads/:id/comments', () => {
        test('should create a comment on a thread', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);
            const thread = await createTestThread(user.id);

            const response = await request(app)
                .post(`/api/threads/${thread.id}/comments`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    content: 'This is a test comment',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.content).toBe('This is a test comment');
            expect(response.body.data.threadId).toBe(thread.id);
        });

        test('should reject comment without authentication', async () => {
            const user = await createTestUser();
            const thread = await createTestThread(user.id);

            const response = await request(app)
                .post(`/api/threads/${thread.id}/comments`)
                .send({
                    content: 'This should fail',
                });

            expect(response.status).toBe(401);
        });

        test('should reject empty comment', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);
            const thread = await createTestThread(user.id);

            const response = await request(app)
                .post(`/api/threads/${thread.id}/comments`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    content: '',
                });

            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/threads/:id/comments', () => {
        test('should get all comments for a thread', async () => {
            const user = await createTestUser();
            const thread = await createTestThread(user.id);

            // Create some comments
            await createTestComment(user.id, thread.id, 'Comment 1');
            await createTestComment(user.id, thread.id, 'Comment 2');

            const response = await request(app)
                .get(`/api/threads/${thread.id}/comments`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBe(2);
        });
    });

    describe('POST /api/comments/:id/replies', () => {
        test('should create a reply to a comment', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);
            const thread = await createTestThread(user.id);
            const comment = await createTestComment(user.id, thread.id, 'Parent comment');

            const response = await request(app)
                .post(`/api/comments/${comment.id}/replies`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    content: 'This is a reply',
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.content).toBe('This is a reply');
            expect(response.body.data.parentId).toBe(comment.id);
        });
    });

    describe('DELETE /api/comments/:id', () => {
        test('should delete comment when user is owner', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);
            const thread = await createTestThread(user.id);
            const comment = await createTestComment(user.id, thread.id);

            const response = await request(app)
                .delete(`/api/comments/${comment.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        test('should reject deletion when user is not owner', async () => {
            const owner = await createTestUser();
            const otherUser = await createTestUser({ email: 'other@test.com', username: 'otheruser' });
            const token = getAuthToken(otherUser.id);
            const thread = await createTestThread(owner.id);
            const comment = await createTestComment(owner.id, thread.id);

            const response = await request(app)
                .delete(`/api/comments/${comment.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
        });
    });
});
