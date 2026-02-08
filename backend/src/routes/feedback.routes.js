import express from 'express';
import { createFeedback } from '../controllers/feedback.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply optional authentication - we want to capture user ID if logged in, but allow anonymous feedback if needed.
// However, the current authenticate middleware might block if no token is present. 
// Let's check the authenticate middleware first. 
// For now, I'll assume we want to support both. 
// If the frontend always sends a token for logged-in users, we can use a custom middleware or just let the controller handle logic if it's not strict.
// But typically `authenticate` throws 401 if valid token is missing but required.
// If we want optional auth, we might need a different middleware "identifyUser" that doesn't error on missing token.

// For this app, let's assume feedback is for logged-in users primarily, OR we can check how 'authenticate' is implemented.
// Let's stick to the plan: use authenticate if available.
// If the user expects anonymous feedback, we might need to adjust.
// Let's assume for now we use the `authenticate` middleware, which populates `req.user`.

// Wait, looking at other routes (e.g. comments), they usually require auth. 
// The frontend FeedbackView has "Back to Settings", implying it's a logged-in area feature.
// So let's require authentication for now.

router.post('/', authenticate, createFeedback);

export default router;
