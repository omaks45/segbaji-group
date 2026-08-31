import { BadRequestException } from '@nestjs/common';

export enum DateRangePreset {
    TODAY = 'TODAY',
    THIS_WEEK = 'THIS_WEEK',
    THIS_MONTH = 'THIS_MONTH',
    THIS_QUARTER = 'THIS_QUARTER',
    THIS_YEAR = 'THIS_YEAR',
    CUSTOM = 'CUSTOM',
}

export interface DateRange {
    start: Date;
    end: Date; // exclusive
}

/**
 * Resolves a preset (or explicit from/to) into a concrete [start, end)
 * range. `end` is always exclusive, so every query in ReportsService
 * uses the same `gte start, lt end` shape without each one re-deriving
 * its own boundary logic.
 */
export function resolveDateRange(preset: DateRangePreset, from?: string, to?: string): DateRange {
    const now = new Date();

    switch (preset) {
        case DateRangePreset.TODAY: {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return { start, end };
        }
        case DateRangePreset.THIS_WEEK: {
        const dayOfWeek = now.getDay(); // 0 = Sunday
        const daysSinceMonday = (dayOfWeek + 6) % 7;
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        return { start, end };
        }
        case DateRangePreset.THIS_MONTH: {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return { start, end };
        }
        case DateRangePreset.THIS_QUARTER: {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        const start = new Date(now.getFullYear(), quarterStartMonth, 1);
        const end = new Date(now.getFullYear(), quarterStartMonth + 3, 1);
        return { start, end };
        }
        case DateRangePreset.THIS_YEAR: {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear() + 1, 0, 1);
        return { start, end };
        }
        case DateRangePreset.CUSTOM: {
            if (!from || !to) {
                throw new BadRequestException('from and to are required when preset=CUSTOM');
            }
            const start = new Date(from);
            const inclusiveEnd = new Date(to);
            if (Number.isNaN(start.getTime()) || Number.isNaN(inclusiveEnd.getTime())) {
                throw new BadRequestException('from/to must be valid dates');
            }
            if (start > inclusiveEnd) {
                throw new BadRequestException('from must be after to');
            }
            const end = new Date(inclusiveEnd);
            end.setDate(end.getDate() + 1); // make "to" inclusive of its whole day
            return { start, end };
        }
    }
}

/** The equal-length period immediately preceding `range` — what "vs last period" compares against. */
export function priorPeriod(range: DateRange): DateRange {
    const durationMs = range.end.getTime() - range.start.getTime();
    return {
        start: new Date(range.start.getTime() - durationMs),
        end: new Date(range.start),
    };
}

/**
 * Returns null (not Infinity, not a huge number) when the prior period
 * was zero — "up from nothing" doesn't have a meaningful percentage,
 * and the frontend can render null as "New" instead of a nonsensical
 * "+∞%".
 */
export function percentChange(current: number, previous: number): number | null {
    if (previous === 0) return current === 0 ? 0 : null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
}