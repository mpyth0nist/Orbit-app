import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../index.js';
import { createTestUser, getAuthToken, createTestThread, createTestComment } from './helpers/testUtils.js';
import { prisma } from './setup.js';

describe('Reactions API', () => {
    describe('POST /api/reactions/thread/:id', () => {
        test('should like a thread', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);
            const thread = await createTestThread(user.id);

            const response = await request(app)
                .post(`/api/reactions/thread/${thread.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify reaction was created
            const reaction = await prisma.reaction.findFirst({
                where: {
                    userId: user.id,
                    threadId: thread.id,
                },
            });
            expect(reaction).toBeTruthy();
        });

        test('should unlike a thread (toggle)', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);
            const thread = await createTestThread(user.id);

            // First like
            await request(app)
                .post(`/api/reactions/thread/${thread.id}`)
                .set('Authorization', `Bearer ${token}`);

            // Then unlike
            const response = await request(app)
                .post(`/api/reactions/thread/${thread.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);

            // Verify reaction was removed
            const reaction = await prisma.reaction.findFirst({
                where: {
                    userId: user.id,
                    threadId: thread.id,
                },
            });
            expect(reaction).toBeNull();
        });

        test('should reject reaction without authentication', async () => {
            const user = await createTestUser();
            const thread = await createTestThread(user.id);

            const response = await request(app)
                .post(`/api/reactions/thread/${thread.id}`);

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/reactions/comment/:id', () => {
        test('should like a comment', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);
            const thread = await createTestThread(user.id);
            const comment = await createTestComment(user.id, thread.id);

            const response = await request(app)
                .post(`/api/reactions/comment/${comment.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify reaction was created
            const reaction = await prisma.reaction.findFirst({
                where: {
                    userId: user.id,
                    commentId: comment.id,
                },
            });
            expect(reaction).toBeTruthy();
        });

        test('should unlike a comment (toggle)', async () => {
            const user = await createTestUser();
            const token = getAuthToken(user.id);
            const thread = await createTestThread(user.id);
            const comment = await createTestComment(user.id, thread.id);

            // First like
            await request(app)
                .post(`/api/reactions/comment/${comment.id}`)
                .set('Authorization', `Bearer ${token}`);

            // Then unlike
            const response = await request(app)
                .post(`/api/reactions/comment/${comment.id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);

            // Verify reaction was removed
            const reaction = await prisma.reaction.findFirst({
                where: {
                    userId: user.id,
                    commentId: comment.id,
                },
            });
            expect(reaction).toBeNull();
        });
    });

    describe('Reaction constraints', () => {
        test('should prevent duplicate reactions at database level', async () => {
            const user = await createTestUser();
            const thread = await createTestThread(user.id);

            // Create a reaction directly
            await prisma.reaction.create({
                data: {
                    userId: user.id,
                    threadId: thread.id,
                },
            });

            // Try to create duplicate
            await expect(
                prisma.reaction.create({
                    data: {
                        userId: user.id,
                        threadId: thread.id,
                    },
                })
            ).rejects.toThrow();
        });
    });
});
