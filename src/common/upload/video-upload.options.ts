// Mirrors your existing image-upload.options.ts, but sized for video.
// Same lesson learned from the image bug applies: don't filter by client
// mimetype here (unreliable both ways) — only cap size at the Multer level.
// The real content check happens in CloudinaryService.uploadVideoBuffer.
//
// This is a SIZE ceiling only, not a duration ceiling — Multer buffers
// raw bytes and has no way to decode/inspect video length. The actual
// "max 2 minutes" rule is enforced in ProjectsService.addVideos(), after
// upload, using the duration Cloudinary reports back. This size limit
// just needs to be generous enough that a real, in-policy video (up to
// ~2 minutes, ordinary phone-recording quality) never gets rejected for
// size alone before duration is even checked.

import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export function videoUploadOptions(): MulterOptions {
    return {
        storage: memoryStorage(),
        limits: {
        // Raised from 100MB -> 250MB. A 2-minute clip at typical phone
        // recording quality (1080p, standard bitrate) can land anywhere
        // from ~100MB to ~200MB+ depending on device/codec, so 100MB was
        // rejecting legitimate in-policy videos, not just oversized ones.
        // Keep this in sync with MAX_VIDEO_SIZE_BYTES in cloudinary.service.ts.
        fileSize: 250 * 1024 * 1024, // 250MB
        },
    };
}