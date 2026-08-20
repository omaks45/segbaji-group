/**
 * Permission keys follow "resource:action". A role's permissions array
 * may contain an exact key, "*:action" (any resource, that action), or
 * "*" (everything — Super Admin). Only resources actually gated so far
 * are declared here — add one line per module as it gets a guard, not
 * ahead of time.
 */
export const PERMISSIONS = {
    DEPARTMENTS_READ: 'departments:read',
    DEPARTMENTS_WRITE: 'departments:write',
    ROLES_READ: 'roles:read',
    ROLES_WRITE: 'roles:write',
    TEAM_WRITE: 'team:write',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];