/**
 * Storage Service
 * Handles file uploads to Cloudflare R2 (S3-compatible)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import path from 'path';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'buzz';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_PUBLIC_URL) {
  console.warn('⚠️  R2 configuration missing. File uploads will not work.');
}

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || '',
  },
});

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

/**
 * Upload a file buffer to R2
 */
export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
  advertiserId?: string,
  campaignId?: string
): Promise<UploadResult> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 configuration not set');
  }

  // Generate unique filename
  const ext = path.extname(originalFilename).toLowerCase();
  const filename = `${randomUUID()}${ext}`;
  
  // Organize by advertiser/campaign if provided
  const key = advertiserId && campaignId
    ? `creatives/${advertiserId}/${campaignId}/${filename}`
    : advertiserId
    ? `creatives/${advertiserId}/${filename}`
    : `creatives/${filename}`;

  // Upload to R2
  // Note: R2 doesn't use ACLs - public access is controlled via bucket settings
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Generate public URL
  const url = `${R2_PUBLIC_URL}/${key}`;

  return {
    url,
    key,
    size: buffer.length,
    contentType,
  };
}

/**
 * Delete a file from R2
 */
export async function deleteFile(key: string): Promise<void> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 configuration not set');
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Get file URL from key
 */
export function getFileUrl(key: string): string {
  if (!R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL not configured');
  }
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Validate file type
 */
export function isValidFileType(mimetype: string): boolean {
  const validTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Videos
    'video/mp4',
    'video/quicktime', // MOV
    'video/webm',
  ];
  return validTypes.includes(mimetype.toLowerCase());
}

/**
 * Validate file size
 */
export function isValidFileSize(size: number, mimetype: string): boolean {
  const isImage = mimetype.startsWith('image/');
  const isVideo = mimetype.startsWith('video/');
  
  if (isImage) {
    return size <= 5 * 1024 * 1024; // 5MB
  }
  if (isVideo) {
    return size <= 200 * 1024 * 1024; // 200MB
  }
  return false;
}

