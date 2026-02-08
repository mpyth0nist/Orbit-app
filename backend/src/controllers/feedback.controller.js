import { prisma } from '../utils/prisma.js';

export const createFeedback = async (req, res, next) => {
    try {
        const { type, message, rating } = req.body;
        const userId = req.user ? req.user.id : null;

        if (!type || !message || !rating) {
            return res.status(400).json({
                success: false,
                message: 'Type, message, and rating are required',
            });
        }

        const feedback = await prisma.feedback.create({
            data: {
                userId,
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
