import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

/**
 * Translates common Prisma write-error codes into clean, user-facing
 * exceptions instead of letting the raw PrismaClientKnownRequestError
 * (internal file paths, stack trace, SQL constraint names) reach the
 * client. `fieldLabels` lets a caller map a technical field name (e.g.
 * "projectId") to a friendlier one shown to the user.
 */
export function translatePrismaWriteError(err: unknown, fieldLabels: Record<string, string> = {}): unknown {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return err;

    if (err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'value';
        return new ConflictException(`A record with this ${target} already exists`);
    }

    if (err.code === 'P2003') {
        // Prisma's meta.field_name typically looks like "Task_projectId_fkey (index)"
        const rawField = (err.meta?.field_name as string | undefined) ?? '';
        const match = rawField.match(/_(\w+)_fkey/);
        const fieldName = match?.[1];
        const label = (fieldName && fieldLabels[fieldName]) || fieldName || 'a referenced field';
        return new BadRequestException(`${label} does not point to a real, existing record`);
    }

    if (err.code === 'P2025') {
        return new BadRequestException('The record you tried to update no longer exists');
    }

    return err;
}