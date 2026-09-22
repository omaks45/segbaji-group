export const LOGO_CID = 'logo';

/**
 * "Glass card" email look — table-based layout (not divs) because Outlook
 * desktop renders email HTML with Word's engine, which ignores most modern
 * CSS (flexbox, div-based centering, backdrop-filter, etc.) but has decent,
 * predictable support for nested <table> layouts. This is why every
 * production-grade transactional email (Stripe, GitHub, etc.) is still
 * table-based under the hood.
 *
 * True CSS `backdrop-filter` glassmorphism (frosted blur over a photo) is
 * NOT supported in Outlook desktop at all, so this approximates the "glass
 * card" look instead: a soft, light, semi-translucent-looking card that
 * floats on a solid dark navy background, with a subtle border and shadow.
 * Modern clients (Gmail, Apple Mail, Outlook.com/mobile) render the shadow
 * and rounded corners; Outlook desktop falls back to a clean flat card with
 * square corners — still fully readable and on-brand, just less "glassy".
 *
 * Logo sizing: displayed at 56x56. For this to look crisp (not blurry) on
 * high-DPI phone/retina screens, export assets/logo.png at 2-3x that
 * resolution — 112x112 or 168x168px — and keep it square. Both the CSS
 * style AND the HTML width/height attributes are set below; Outlook
 * specifically often ignores CSS sizing on <img> and only respects the
 * HTML attributes, so both are required, not just one.
 */
export function wrapEmailTemplate(bodyHtml: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0; padding:0; background-color:#0f1c2e;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0f1c2e; padding:32px 16px;">
        <tr>
            <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px; background-color:#f7f9fc; border:1px solid #e2e8f0; border-radius:16px; box-shadow:0 8px 24px rgba(0,0,0,0.25); overflow:hidden;">

                <!-- Header -->
                <tr>
                <td align="center" style="background-color:#ffffff; padding:28px 24px 20px; border-bottom:1px solid #e9edf3;">
                    <img
                    src="cid:${LOGO_CID}"
                    alt="Segbaji & Son"
                    width="56"
                    height="56"
                    style="width:56px; height:56px; display:block; margin:0 auto;"
                    />
                </td>
                </tr>

                <!-- Body -->
                <tr>
                <td style="padding:28px 28px 8px; font-family:Arial, Helvetica, sans-serif; color:#1a2333; font-size:15px; line-height:1.6;">
                    ${bodyHtml}
                </td>
                </tr>

                <!-- Footer -->
                <tr>
                <td align="center" style="padding:20px 24px 24px;">
                    <div style="border-top:1px solid #e2e8f0; padding-top:16px; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#8a94a6;">
                    Segbaji &amp; Son Nig. Ltd.
                    </div>
                </td>
                </tr>

            </table>
            </td>
        </tr>
        </table>
    </body>
    </html>`;
}