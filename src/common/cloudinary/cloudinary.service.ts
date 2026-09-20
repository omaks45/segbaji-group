import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import type { AppConfig } from '../config/app-config';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export interface CloudinaryVideoUploadResult extends CloudinaryUploadResult {
  thumbnailUrl: string;
  duration: number | null;
}

type CloudinaryResourceType = 'image' | 'video' | 'raw';

const ALLOWED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
  'video/x-matroska', // .mkv
]);

// Check this against your actual Cloudinary plan's per-file video limit —
// free-tier accounts commonly cap video uploads around 100MB.
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;

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
   * For Project (and any future) video uploads. Mirrors uploadBuffer()'s
   * shape and error handling exactly, but:
   *   - validates against real video magic bytes, not image ones
   *   - passes resource_type: 'video' (Cloudinary defaults to 'image' if
   *     this is omitted, which silently mishandles video files)
   *   - returns a poster-frame thumbnail URL and duration for free, since
   *     Cloudinary derives both from the uploaded video with no second
   *     upload needed
   */
  async uploadVideoBuffer(
    buffer: Buffer,
    options: { folder: string },
  ): Promise<CloudinaryVideoUploadResult> {
    if (buffer.length > MAX_VIDEO_SIZE_BYTES) {
      throw new BadRequestException('Video file is too large.');
    }
    await this.assertIsRealVideo(buffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: 'video',
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Cloudinary video upload failed: ${error?.message}`);
            return reject(error ?? new Error('Cloudinary video upload failed'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            thumbnailUrl: result.secure_url.replace(/\.[^/.]+$/, '.jpg'),
            duration: result.duration ?? null,
          });
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

  /** Same content-sniffing principle as assertIsRealImage(), scoped to the video formats we accept. */
  private async assertIsRealVideo(buffer: Buffer): Promise<void> {
    const { fileTypeFromBuffer } = await import('file-type');
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_VIDEO_MIME_TYPES.has(detected.mime)) {
      throw new BadRequestException('File must be a valid video (mp4, mov, webm, or mkv).');
    }
  }

  /**
   * Best-effort cleanup — logged, not thrown, so a failed delete never
   * breaks the caller's main flow.
   *
   * `resourceType` now matters: deleting a video asset without passing
   * resource_type: 'video' silently no-ops on Cloudinary's side (it
   * defaults to assuming 'image' and finds nothing to delete), leaving an
   * orphaned video in storage. Existing image-delete call sites are
   * unaffected — the default stays 'image'.
   */
  async deleteAsset(publicId: string, resourceType: CloudinaryResourceType = 'image'): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
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

  /**
   * For non-image files (generated CSV/XLSX reports). Skips the
   * magic-byte image check that uploadBuffer() enforces — that check
   * exists to validate untrusted client uploads; this content is
   * generated server-side by trusted code, not submitted by a user, so
   * there's nothing to validate against.
   */
  async uploadRawBuffer(
    buffer: Buffer,
    options: { folder: string; filename: string; format: 'csv' | 'xlsx' },
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          resource_type: 'raw',
          public_id: `${options.filename}.${options.format}`,
          use_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Cloudinary raw upload failed: ${error?.message}`);
            return reject(error ?? new Error('Cloudinary raw upload failed'));
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  }
}