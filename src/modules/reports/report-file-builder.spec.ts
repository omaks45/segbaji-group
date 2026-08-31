import { buildCsvBuffer, ReportExportData } from './report-file-builder';

const sampleData: ReportExportData = {
    summary: { totalRevenue: { value: 5000000, percentChange: 12 } },
    quoteRequestsOverTime: [{ date: '2026-08-01', value: 3 }],
    projectsByStatus: [{ status: 'COMPLETED', count: 2 }],
    revenueOverTime: [{ date: '2026-08-01', value: 5000000 }],
    topServices: [{ serviceId: 's1', serviceName: 'Construction', requestCount: 4 }],
    projectsByLocation: [{ state: 'Lagos', count: 3, percentage: 100 }],
    };

    describe('buildCsvBuffer', () => {
    it('produces a buffer containing every section header', () => {
        const buffer = buildCsvBuffer(sampleData);
        const text = buffer.toString('utf-8');

        expect(text).toContain('SUMMARY');
        expect(text).toContain('QUOTE REQUESTS OVER TIME');
        expect(text).toContain('PROJECTS BY STATUS');
        expect(text).toContain('REVENUE OVER TIME');
        expect(text).toContain('TOP SERVICES');
        expect(text).toContain('PROJECTS BY LOCATION');
    });

    it('serializes nested objects in the summary section rather than printing [object Object]', () => {
    const buffer = buildCsvBuffer(sampleData);
    const text = buffer.toString('utf-8');
    expect(text).not.toContain('[object Object]');
    // CSV-escaped: internal quotes are doubled per RFC 4180, so this
    // checks for the value with CSV's actual quoting style, not raw JSON.
    expect(text).toContain('""value"":5000000');
    });

    it('includes actual row data, not just headers', () => {
        const buffer = buildCsvBuffer(sampleData);
        const text = buffer.toString('utf-8');
        expect(text).toContain('Construction');
        expect(text).toContain('Lagos');
    });
});