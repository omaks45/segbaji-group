import { NextFunction, Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';

const EXCLUDED_FIELDS = new Set(['password', 'confirmPassword', 'newPassword']);

function sanitizeValue(value: unknown, key?: string): unknown {
    if (key && EXCLUDED_FIELDS.has(key)) return value;

    if (typeof value === 'string') {
        return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
    }
    if (value && typeof value === 'object') {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
        result[k] = sanitizeValue(v, k);
        }
        return result;
    }
    return value;
}

/**
 * Strips HTML/script markup from every string field in the request
 * body, recursively, before it reaches validation or a controller.
 * Covers every JSON-body endpoint app-wide.
 *
 * Known gap: multipart/form-data fields (e.g. a project image's
 * "caption") are parsed by Multer at the per-route interceptor level,
 * which runs after this global middleware — so those specific fields
 * are NOT covered by this pass. Flagging rather than silently claiming
 * full coverage; a second, multipart-aware sanitization step would be
 * needed to close that specific gap if it becomes a real concern.
 */
export function sanitizeRequestBody(req: Request, _res: Response, next: NextFunction) {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeValue(req.body);
    }
    next();
}