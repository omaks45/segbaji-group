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
    TEAM_READ: 'team:read',
    TEAM_WRITE: 'team:write',
    LEADS_READ: 'leads:read',
    LEADS_WRITE: 'leads:write',
    CONTACT_MESSAGES_READ: 'contact-messages:read',
    CONTACT_MESSAGES_WRITE: 'contact-messages:write',
    CONTENT_READ: 'content:read',
    CONTENT_WRITE: 'content:write',
    REPORTS_READ: 'reports:read',
    REPORTS_WRITE: 'reports:write',
    TASKS_READ: 'tasks:read',
    TASKS_WRITE: 'tasks:write',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Folded into a user's JWT `permissions` array at login/refresh whenever
 * `User.isTeamLead` is true — on top of whatever their professional Role
 * (Engineer, Surveyor, etc.) already grants. This is what lets someone
 * keep their profession while also gaining department-lead capabilities,
 * without every existing @RequirePermissions guard needing to know about
 * `isTeamLead` at all.
 */
export const TEAM_LEAD_PERMISSIONS: string[] = [
    PERMISSIONS.TASKS_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.TEAM_READ,
];