/** Shared by PermissionsGuard and anything else that needs to check a
 * permission string against a granted array outside the guard's own
 * request-cycle context (e.g. building a dashboard payload). */
export function hasPermission(granted: string[], required: string): boolean {
    if (granted.includes('*')) return true;
    if (granted.includes(required)) return true;
    const [, action] = required.split(':');
    return granted.includes(`*:${action}`);
}