import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Shared Multer config for every "upload one image" endpoint. Only
 * enforces a size limit here — file *type* is deliberately not checked
 * at this layer anymore.
 *
 * Why: this used to also reject anything whose client-declared
 * `mimetype` didn't start with "image/". That field is attacker-
 * controlled (easy to spoof past) AND unreliable in the other
 * direction — some clients (Postman included) send a generic
 * "application/octet-stream" for legitimate images they can't
 * confidently auto-detect, which was wrongly rejecting real uploads.
 * CloudinaryService.uploadBuffer() already inspects the file's actual
 * binary content (magic-byte sniffing via `file-type`) before it's
 * ever sent to Cloudinary — that's the one real check, so this layer
 * no longer duplicates a weaker, less trustworthy version of it.
 */
export function imageUploadOptions(maxBytes: number = DEFAULT_MAX_IMAGE_BYTES): MulterOptions {
    return {
        storage: memoryStorage(),
        limits: { fileSize: maxBytes },
    };
}