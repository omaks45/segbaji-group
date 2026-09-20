import * as ExcelJSModule from 'exceljs';
import { stringify } from 'csv-stringify/sync';

// Handles both possible export shapes: `export default Workbook` vs
// `export = { Workbook }` — same interop inconsistency that hit
// Nodemailer's default import earlier in this project.
const Workbook = (ExcelJSModule as any).Workbook ?? (ExcelJSModule as any).default?.Workbook;

export interface ReportExportData {
    summary: Record<string, unknown>;
    quoteRequestsOverTime: { date: string; value: number }[];
    // Was `{ status: string; count: number }[]` — Project.status was
    // dropped from the schema. reports.service.ts now groups by
    // isPublished instead, the closest lifecycle-adjacent field left.
    projectsByStatus: { isPublished: boolean; count: number }[];
    revenueOverTime: { date: string; value: number }[];
    topServices: { serviceId: string; serviceName: string; requestCount: number }[];
    // Was `{ state: string; count: number; percentage: number }[]` —
    // Project.state was dropped along with location data entirely.
    // reports.service.ts now groups by category instead.
    projectsByLocation: { category: string; count: number; percentage: number }[];
}

export async function buildXlsxBuffer(data: ReportExportData): Promise<Buffer> {
    const workbook = new Workbook();

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Metric', 'Value']);
    for (const [key, value] of Object.entries(data.summary)) {
        summarySheet.addRow([key, typeof value === 'object' ? JSON.stringify(value) : value]);
    }

    addTableSheet(workbook, 'Quote Requests Over Time', ['Date', 'Count'], data.quoteRequestsOverTime.map((r) => [r.date, r.value]));
    addTableSheet(
        workbook,
        'Projects By Publish State',
        ['Published?', 'Count'],
        data.projectsByStatus.map((r) => [r.isPublished ? 'Published' : 'Draft', r.count]),
    );
    addTableSheet(workbook, 'Revenue Over Time', ['Week', 'Revenue (NGN)'], data.revenueOverTime.map((r) => [r.date, r.value]));
    addTableSheet(workbook, 'Top Services', ['Service', 'Requests'], data.topServices.map((r) => [r.serviceName, r.requestCount]));
    addTableSheet(
        workbook,
        'Projects By Category',
        ['Category', 'Count', '%'],
        data.projectsByLocation.map((r) => [r.category, r.count, r.percentage]),
    );

    return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function buildCsvBuffer(data: ReportExportData): Buffer {
    const sections: string[] = [];

    sections.push('SUMMARY');
    sections.push(stringify(Object.entries(data.summary).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v])));

    sections.push('QUOTE REQUESTS OVER TIME');
    sections.push(stringify(data.quoteRequestsOverTime.map((r) => [r.date, r.value]), { header: true, columns: ['Date', 'Count'] }));

    sections.push('PROJECTS BY PUBLISH STATE');
    sections.push(
        stringify(
            data.projectsByStatus.map((r) => [r.isPublished ? 'Published' : 'Draft', r.count]),
            { header: true, columns: ['Published?', 'Count'] },
        ),
    );

    sections.push('REVENUE OVER TIME');
    sections.push(stringify(data.revenueOverTime.map((r) => [r.date, r.value]), { header: true, columns: ['Week', 'Revenue (NGN)'] }));

    sections.push('TOP SERVICES');
    sections.push(stringify(data.topServices.map((r) => [r.serviceName, r.requestCount]), { header: true, columns: ['Service', 'Requests'] }));

    sections.push('PROJECTS BY CATEGORY');
    sections.push(
        stringify(
            data.projectsByLocation.map((r) => [r.category, r.count, r.percentage]),
            { header: true, columns: ['Category', 'Count', '%'] },
        ),
    );

    return Buffer.from(sections.join('\n\n'));
}

function addTableSheet(workbook: any, name: string, header: string[], rows: (string | number)[][]) {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(header);
    rows.forEach((row) => sheet.addRow(row));
}