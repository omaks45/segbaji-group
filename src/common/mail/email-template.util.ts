export const LOGO_CID = 'segbaji-logo';

/**
 * Wraps every outgoing email's body in a consistent branded header
 * (logo) and footer. Width is set explicitly, height left to "auto" —
 * the safe, universal way to embed a logo without stretching or
 * squishing it, since not every email client honors object-fit or
 * max-width the same way.
 */
export function wrapEmailTemplate(bodyHtml: string): string {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #222222;">
        <div style="text-align: center; padding: 24px 0 16px;">
        <img
            src="cid:${LOGO_CID}"
            alt="Segbaji & Son"
            width="180"
            style="width: 180px; height: auto; display: block; margin: 0 auto;"
        />
        </div>
        <div style="padding: 0 24px 24px; line-height: 1.5;">
        ${bodyHtml}
        </div>
        <div style="text-align: center; padding: 16px; font-size: 12px; color: #888888; border-top: 1px solid #eeeeee;">
        Segbaji & Son Nig. Ltd.
        </div>
    </div>`;
}