/**
 * Orbit Backend Server
 * 
 * Main entry point for the Orbit social media API.
 * Configures middleware, routes, and error handling.
 * 
 * @module index
 */

import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import helmet from 'helmet';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import threadRoutes from './routes/threads.routes.js';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { httpLogger } from './utils/logger.js';
import logger from './utils/logger.js';
import { disconnectPrisma } from './utils/prisma.js';

const app = express();
const port = process.env.PORT || 3000;

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet - Security headers
app.use(helmet());

// CORS - Configure allowed origins
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================================================
// General Middleware
// ============================================================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP request logging
app.use(httpLogger);

// Rate limiting for all API routes
app.use('/api/', apiLimiter);

// ============================================================================
// Health Check
// ============================================================================

app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================================================
// API Routes
// ============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/threads', threadRoutes);

// TODO: Add notifications route when controller is implemented
// app.use('/api/notifications', notificationRoutes);

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

// ============================================================================
// Server Start
// ============================================================================

const server = app.listen(port, () => {
    logger.info(`🚀 Server is running on port ${port}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 API: http://localhost:${port}/api`);
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

const gracefulShutdown = async (signal) => {
    logger.info(`\n${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async () => {
        logger.info('HTTP server closed');

        // Disconnect from database
        try {
            await disconnectPrisma();
            logger.info('Database connection closed');
        } catch (error) {
            logger.error('Error disconnecting from database:', error);
        }

        // Exit process
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

export default app;