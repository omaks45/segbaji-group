import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Shared Multer config for every "upload one image" endpoint (profile
 * pictures, service hero images, project cover/gallery images, and
 * property images next). Written once here instead of re-declared per
 * controller — this is the third near-identical copy this would have
 * been otherwise.
 */
export function imageUploadOptions(maxBytes: number = DEFAULT_MAX_IMAGE_BYTES): MulterOptions {
    return {
        storage: memoryStorage(),
        limits: { fileSize: maxBytes },
        fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
            return callback(new BadRequestException('File must be an image'), false);
        }
        callback(null, true);
        },
    };
}