import { prisma } from '../utils/prisma.js';

export const createFeedback = async (req, res, next) => {
    try {
        const { type, message, rating } = req.body;
        // req.user is populated by the protect middleware, and contains { userId: ... }
        const userId = req.user ? req.user.userId : null;

        if (!type || !message || !rating) {
            return res.status(400).json({
                success: false,
                message: 'Type, message, and rating are required',
            });
        }

        const feedback = await prisma.feedback.create({
            data: {
                userId: userId ? parseInt(userId) : null,
                type,
                message,
                rating,
            },
        });

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: feedback,
        });
    } catch (error) {
        next(error);
    }
};
