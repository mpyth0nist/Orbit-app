import express from 'express';
import { createFeedback } from '../controllers/feedback.controller.js';
import protect from '../middleware/protect.js';

const router = express.Router();

router.post('/', protect, createFeedback);

export default router;
