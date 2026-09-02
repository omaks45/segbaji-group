declare module 'file-type' {
    export interface FileTypeResult {
        ext: string;
        mime: string;
    }

    export function fileTypeFromBuffer(
        buffer: Buffer | Uint8Array,
    ): Promise<FileTypeResult | undefined>;
}