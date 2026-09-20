
// Mirrors your existing image-upload.options.ts, but sized for video.
// Same lesson learned from the image bug applies: don't filter by client
// mimetype here (unreliable both ways) — only cap size at the Multer level.
// The real content check happens in CloudinaryService.uploadVideoBuffer.

import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export function videoUploadOptions(): MulterOptions {
    return {
        storage: memoryStorage(),
        limits: {
        fileSize: 100 * 1024 * 1024, // 100MB — keep in sync with MAX_VIDEO_SIZE_BYTES in cloudinary.service.ts
        },
    };
}