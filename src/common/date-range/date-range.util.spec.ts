import { BadRequestException } from '@nestjs/common';
import { DateRangePreset, percentChange, priorPeriod, resolveDateRange } from './date-range.util';

describe('resolveDateRange', () => {
    it('THIS_MONTH spans the 1st of this month to the 1st of next month', () => {
        const range = resolveDateRange(DateRangePreset.THIS_MONTH);
        expect(range.start.getDate()).toBe(1);
        expect(range.end.getDate()).toBe(1);
        expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    });

    it('THIS_WEEK starts on Monday regardless of what day today is', () => {
        const range = resolveDateRange(DateRangePreset.THIS_WEEK);
        expect(range.start.getDay()).toBe(1); // Monday
    });

    describe('CUSTOM', () => {
        it('throws when from/to are missing', () => {
        expect(() => resolveDateRange(DateRangePreset.CUSTOM)).toThrow(BadRequestException);
        });

        it('throws when from is after to', () => {
        expect(() => resolveDateRange(DateRangePreset.CUSTOM, '2026-09-01', '2026-08-01')).toThrow(BadRequestException);
        });

        it('makes "to" inclusive of its full day', () => {
        const range = resolveDateRange(DateRangePreset.CUSTOM, '2026-08-01', '2026-08-01');
        expect(range.end.getDate()).toBe(2); // exclusive end is the day after
        });

        it('throws on an unparseable date string', () => {
        expect(() => resolveDateRange(DateRangePreset.CUSTOM, 'not-a-date', '2026-08-01')).toThrow(BadRequestException);
        });
    });
    });

    describe('priorPeriod', () => {
    it('returns a period of the same length immediately before the given range', () => {
        const range = { start: new Date('2026-08-01'), end: new Date('2026-09-01') };
        const prior = priorPeriod(range);

        expect(prior.end.getTime()).toBe(range.start.getTime());
        expect(prior.end.getTime() - prior.start.getTime()).toBe(range.end.getTime() - range.start.getTime());
    });
    });

    describe('percentChange', () => {
    it('computes a positive percentage increase, rounded to one decimal', () => {
        expect(percentChange(15, 10)).toBe(50);
    });

    it('computes a negative percentage for a decrease', () => {
        expect(percentChange(8, 10)).toBe(-20);
    });

    it('returns 0 when both current and previous are 0 — not null, not NaN', () => {
        expect(percentChange(0, 0)).toBe(0);
    });

    it('returns null when previous is 0 but current is not — avoids reporting "+Infinity%"', () => {
        expect(percentChange(5, 0)).toBeNull();
    });
});