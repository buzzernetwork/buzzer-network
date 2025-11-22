/**
 * Upload Middleware
 * Handles multipart/form-data file uploads with validation
 */

import multer from 'multer';
import { Request } from 'express';
import { isValidFileType, isValidFileSize } from '../services/storage.service.js';

// Configure multer to use memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!isValidFileType(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, MOV, WebM`));
  }
  cb(null, true);
};

// Create upload middleware with size limits
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max (for videos)
  },
});

// Middleware to validate file size after upload (more specific validation)
export const validateFileSize = (req: Request, res: any, next: any) => {
  if (!req.file) {
    return next();
  }

  const { mimetype, size } = req.file;
  
  if (!isValidFileSize(size, mimetype)) {
    const isImage = mimetype.startsWith('image/');
    const maxSize = isImage ? '5MB' : '200MB';
    return res.status(400).json({
      error: `File too large. Maximum size: ${maxSize}`,
    });
  }

  next();
};

