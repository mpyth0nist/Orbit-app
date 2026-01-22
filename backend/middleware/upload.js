/**
 * Upload Middleware
 * 
 * Configures multer for local file uploads with validation and error handling.
 * Supports thread media and profile pictures.
 * 
 * @module middleware/upload
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Upload Directory Setup
// ============================================================================

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const THREADS_DIR = path.join(UPLOADS_DIR, 'threads');
const PROFILES_DIR = path.join(UPLOADS_DIR, 'profiles');

// Create directories if they don't exist
[UPLOADS_DIR, THREADS_DIR, PROFILES_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// ============================================================================
// Storage Configuration
// ============================================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Determine destination based on fieldname
        const destination = file.fieldname === 'profilePicture'
            ? PROFILES_DIR
            : THREADS_DIR;
        cb(null, destination);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-userId-random-originalname
        const uniqueSuffix = `${Date.now()}-${req.user?.userId || 'unknown'}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
    }
});

// ============================================================================
// File Filter (Validation)
// ============================================================================

const fileFilter = (req, file, cb) => {
    // Allowed MIME types
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MPEG, MOV, WebM) are allowed'), false);
    }
};

// ============================================================================
// Multer Configuration
// ============================================================================

const limits = {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 4 // Max 4 files per request
};

// Profile picture upload (single file, stricter limits)
export const uploadProfilePicture = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB for profile pictures
        files: 1
    }
}).single('profilePicture');

// Thread media upload (multiple files)
export const uploadThreadMedia = multer({
    storage,
    fileFilter,
    limits
}).array('media', 4); // Max 4 media files

// ============================================================================
// Error Handler for Multer
// ============================================================================

export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 50MB for media and 5MB for profile pictures'
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Maximum is 4 files per upload'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected field name in upload'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    if (err) {
        // Custom errors (like file type validation)
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next();
};
