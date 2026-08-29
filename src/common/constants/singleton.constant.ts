/**
 * Fixed row ID shared by every single-record content table (SiteStat,
 * SiteSettings). Living in one place — rather than a schema-level
 * @default("singleton") on each model — means there's exactly one
 * source of truth for it, not two that could quietly drift apart.
 */
export const SINGLETON_ID = 'singleton';