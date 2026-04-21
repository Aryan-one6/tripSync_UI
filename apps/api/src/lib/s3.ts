/**
 * S3 Utility — TripSync
 *
 * Presigned URL generation for secure KYC document access.
 * Uses AWS SDK v3 compatible API.
 *
 * Gracefully degrades when S3 is not configured (dev/test environments).
 */

import { env } from './env.js';

interface S3Config {
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  endpoint?: string;
}

function getS3Config(): S3Config | null {
  if (!env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    return null;
  }
  return {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    endpoint: env.S3_ENDPOINT || undefined,
  };
}

/**
 * Generate a presigned download URL for a private S3 object.
 * Only accessible to admins via the KYC document endpoints.
 *
 * @param s3Key - The S3 object key (never publicly exposed)
 * @param expiresInSeconds - Validity window (max 900 for S3)
 */
export async function generatePresignedDownloadUrl(
  s3Key: string,
  expiresInSeconds: number = 900,
): Promise<string> {
  const config = getS3Config();

  if (!config) {
    console.warn('[s3] S3 not configured, returning mock presigned URL');
    return `https://mock-s3.example.com/${s3Key}?expires=${expiresInSeconds}`;
  }

  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    });

    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: s3Key,
    });

    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    console.error('[s3] Failed to generate presigned URL:', err);
    throw new Error('Failed to generate secure document access URL. Please try again.');
  }
}

/**
 * Generate a presigned upload URL for direct-to-S3 uploads (KYC documents).
 * The frontend uses this URL to upload directly without routing through the API server.
 *
 * @param s3Key - The S3 object key to create
 * @param mimeType - Content-Type of the file being uploaded
 * @param expiresInSeconds - Validity window
 */
export async function generatePresignedUploadUrl(
  s3Key: string,
  mimeType: string,
  expiresInSeconds: number = 300,
): Promise<string> {
  const config = getS3Config();

  if (!config) {
    console.warn('[s3] S3 not configured, returning mock upload URL');
    return `https://mock-s3.example.com/upload/${s3Key}`;
  }

  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

    const client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    });

    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: s3Key,
      ContentType: mimeType,
      // Server-side encryption
      ServerSideEncryption: 'AES256',
    });

    return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    console.error('[s3] Failed to generate presigned upload URL:', err);
    throw new Error('Failed to generate upload URL. Please try again.');
  }
}
