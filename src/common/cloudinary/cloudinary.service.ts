import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import type { AppConfig } from '../config/app-config';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const cfg = this.config.get<AppConfig['cloudinary']>('cloudinary')!;
    cloudinary.config({
      cloud_name: cfg.cloudName,
      api_key: cfg.apiKey,
      api_secret: cfg.apiSecret,
    });
  }

  async uploadBuffer(
    buffer: Buffer,
    options: { folder: string },
  ): Promise<CloudinaryUploadResult> {
    await this.assertIsRealImage(buffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: 'image',
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

  /**
   * Inspects the file's actual binary signature (magic bytes), not the
   * client-supplied `mimetype` header — a renamed .exe claiming to be
   * "image/jpeg" passes Multer's fileFilter (which only checks that
   * header) but fails here, since the header is attacker-controlled and
   * the file's actual bytes are not.
   *
   * `file-type` is ESM-only in current versions; dynamic import() works
   * fine from this CommonJS file without pinning to an older major
   * version.
   */
  private async assertIsRealImage(buffer: Buffer): Promise<void> {
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !detected.mime.startsWith('image/')) {
      throw new BadRequestException('File content does not match a supported image format');
    }
  }

  /** Best-effort cleanup — logged, not thrown, so a failed delete never breaks the caller's main flow. */
  async deleteAsset(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      this.logger.error(`Cloudinary delete failed for ${publicId}: ${(err as Error).message}`);
    }
  }

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