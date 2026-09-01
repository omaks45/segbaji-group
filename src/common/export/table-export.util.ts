import * as ExcelJSModule from 'exceljs';
import { stringify } from 'csv-stringify/sync';

const Workbook = (ExcelJSModule as any).Workbook ?? (ExcelJSModule as any).default?.Workbook;

export interface ExportColumn<T> {
    header: string;
    value: (row: T) => string | number | boolean | null | undefined;
}

function formatCell(value: string | number | boolean | null | undefined): string | number {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value;
    }

export function buildTableCsv<T>(rows: T[], columns: ExportColumn<T>[]): Buffer {
    const data = rows.map((row) => columns.map((c) => formatCell(c.value(row))));
    return Buffer.from(stringify(data, { header: true, columns: columns.map((c) => c.header) }));
}

export async function buildTableXlsx<T>(rows: T[], columns: ExportColumn<T>[], sheetName: string): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet(sheetName);
    sheet.addRow(columns.map((c) => c.header));
    rows.forEach((row) => sheet.addRow(columns.map((c) => formatCell(c.value(row)))));
    return Buffer.from(await workbook.xlsx.writeBuffer());
}