import { BadRequestException } from '@nestjs/common';

/**
 * Shared by every "reorder" endpoint (Service features, Core Values, and
 * future Project/Property galleries): the provided ID list must be
 * exactly the current set, no more, no fewer — prevents silently
 * dropping an item's order or reordering against a stale list.
 */
export function assertExactIdSet(
    existingIds: string[],
    providedIds: string[],
    fieldName: string,
    ): void {
    const existingSet = new Set(existingIds);
    const providedSet = new Set(providedIds);
    const matches =
        existingSet.size === providedSet.size &&
        [...existingSet].every((id) => providedSet.has(id));
    if (!matches) {
        throw new BadRequestException(
        `${fieldName} must include exactly every current item, no more, no fewer`,
        );
    }
}