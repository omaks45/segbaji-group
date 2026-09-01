/** Defaults to CSV on anything unrecognized rather than 400ing — an
 * export button is not worth failing over a typo'd query param. */
export function parseExportFormat(format: unknown): 'csv' | 'xlsx' {
    return format === 'xlsx' ? 'xlsx' : 'csv';
}