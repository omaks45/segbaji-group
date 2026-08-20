import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

/**
 * Generic on purpose — profile pictures, project galleries, and service
 * images all go through the same uploadBuffer()/deleteAsset() pair,
 * distinguished only by the `folder` each call site passes in. One
 * implementation instead of one per feature.
 */
@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const cfg = this.config.get<{
      cloudName: string;
      apiKey: string;
      apiSecret: string;
    }>('cloudinary')!;
    cloudinary.config({
      cloud_name: cfg.cloudName,
      api_key: cfg.apiKey,
      api_secret: cfg.apiSecret,
    });
  }

  uploadBuffer(
    buffer: Buffer,
    options: { folder: string },
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: 'image',
          // Auto-resized and re-encoded — callers don't need to think
          // about format/size, Cloudinary handles it on the way in.
          transformation: [
            { width: 1000, height: 1000, crop: 'limit' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload failed: ${error?.message}`);
            return reject(error ?? new Error('Cloudinary upload failed'));
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  }

  /** Best-effort cleanup — logged, not thrown, so a failed delete never breaks the caller's main flow. */
  async deleteAsset(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      this.logger.error(`Cloudinary delete failed for ${publicId}: ${(err as Error).message}`);
    }
  }

  /** Used by the health check to confirm credentials actually work. */
  async verifyConnection(): Promise<boolean> {
    try {
      await cloudinary.api.ping();
      return true;
    } catch (err) {
      this.logger.error(`Cloudinary ping failed: ${(err as Error).message}`);
      return false;
    }
  }
}