/**
 * Quick CLI test to upload a sample image to Cloudflare R2.
 *
 * Usage:
 * R2_ACCOUNT_ID=... R2_ENDPOINT=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=buzz R2_PUBLIC_URL=... \
 *   npx tsx src/scripts/test-r2-upload.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadFile } from '../services/storage.service.js';

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Use existing marketing background image as sample asset
  const sampleImagePath = path.resolve(
    __dirname,
    '../../../frontend/public/memes/39dd3e9e61b850b619d37837eb6f76f6.jpg'
  );
  if (!fs.existsSync(sampleImagePath)) {
    throw new Error(`Sample image not found at ${sampleImagePath}`);
  }

  const buffer = fs.readFileSync(sampleImagePath);
  console.log(`Uploading sample image (${(buffer.length / 1024).toFixed(2)} KB) to R2...`);

  const result = await uploadFile(
    buffer,
    'sample-meme.jpg',
    'image/jpeg',
    'cli-test',
    'demo-campaign'
  );

  console.log('✅ Upload successful!');
  console.log('URL:', result.url);
  console.log('Key:', result.key);
  console.log('Size:', result.size, 'bytes');
  console.log('Content-Type:', result.contentType);
}

main().catch((error) => {
  console.error('❌ Upload test failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});

