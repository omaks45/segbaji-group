import type { Response } from 'express';

export function sendFileResponse(res: Response, buffer: Buffer, filenameBase: string, format: 'csv' | 'xlsx') {
    const contentType = format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.${format}"`);
    res.send(buffer);
}