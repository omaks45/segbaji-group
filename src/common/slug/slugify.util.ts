/**
 * Converts arbitrary text into a URL-safe slug. Reused by every content
 * module that needs one (Services now; Projects/Properties next) —
 * write it once here instead of per-module.
 */
export function slugify(input: string): string {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}