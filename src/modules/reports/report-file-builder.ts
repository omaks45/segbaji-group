import * as ExcelJSModule from 'exceljs';
import { stringify } from 'csv-stringify/sync';

// Handles both possible export shapes: `export default Workbook` vs
// `export = { Workbook }` — same interop inconsistency that hit
// Nodemailer's default import earlier in this project.
const Workbook = (ExcelJSModule as any).Workbook ?? (ExcelJSModule as any).default?.Workbook;

export interface ReportExportData {
    summary: Record<string, unknown>;
    quoteRequestsOverTime: { date: string; value: number }[];
    projectsByStatus: { status: string; count: number }[];
    revenueOverTime: { date: string; value: number }[];
    topServices: { serviceId: string; serviceName: string; requestCount: number }[];
    projectsByLocation: { state: string; count: number; percentage: number }[];
}

export async function buildXlsxBuffer(data: ReportExportData): Promise<Buffer> {
    const workbook = new Workbook();

    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.addRow(['Metric', 'Value']);
    for (const [key, value] of Object.entries(data.summary)) {
        summarySheet.addRow([key, typeof value === 'object' ? JSON.stringify(value) : value]);
    }

    addTableSheet(workbook, 'Quote Requests Over Time', ['Date', 'Count'], data.quoteRequestsOverTime.map((r) => [r.date, r.value]));
    addTableSheet(workbook, 'Projects By Status', ['Status', 'Count'], data.projectsByStatus.map((r) => [r.status, r.count]));
    addTableSheet(workbook, 'Revenue Over Time', ['Week', 'Revenue (NGN)'], data.revenueOverTime.map((r) => [r.date, r.value]));
    addTableSheet(workbook, 'Top Services', ['Service', 'Requests'], data.topServices.map((r) => [r.serviceName, r.requestCount]));
    addTableSheet(workbook, 'Projects By Location', ['State', 'Count', '%'], data.projectsByLocation.map((r) => [r.state, r.count, r.percentage]));

    return Buffer.from(await workbook.xlsx.writeBuffer());
}

export function buildCsvBuffer(data: ReportExportData): Buffer {
    const sections: string[] = [];

    sections.push('SUMMARY');
    sections.push(stringify(Object.entries(data.summary).map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v])));

    sections.push('QUOTE REQUESTS OVER TIME');
    sections.push(stringify(data.quoteRequestsOverTime.map((r) => [r.date, r.value]), { header: true, columns: ['Date', 'Count'] }));

    sections.push('PROJECTS BY STATUS');
    sections.push(stringify(data.projectsByStatus.map((r) => [r.status, r.count]), { header: true, columns: ['Status', 'Count'] }));

    sections.push('REVENUE OVER TIME');
    sections.push(stringify(data.revenueOverTime.map((r) => [r.date, r.value]), { header: true, columns: ['Week', 'Revenue (NGN)'] }));

    sections.push('TOP SERVICES');
    sections.push(stringify(data.topServices.map((r) => [r.serviceName, r.requestCount]), { header: true, columns: ['Service', 'Requests'] }));

    sections.push('PROJECTS BY LOCATION');
    sections.push(stringify(data.projectsByLocation.map((r) => [r.state, r.count, r.percentage]), { header: true, columns: ['State', 'Count', '%'] }));

    return Buffer.from(sections.join('\n\n'));
}

function addTableSheet(workbook: any, name: string, header: string[], rows: (string | number)[][]) {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(header);
    rows.forEach((row) => sheet.addRow(row));
}