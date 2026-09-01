import { wrapEmailTemplate, LOGO_CID } from './email-template.util';

describe('wrapEmailTemplate', () => {
    it('references the logo via cid, not a URL or base64 data string', () => {
        const html = wrapEmailTemplate('<p>Hello</p>');
        expect(html).toContain(`src="cid:${LOGO_CID}"`);
        expect(html).not.toContain('data:image');
        expect(html).not.toContain('http');
    });

    it('sets an explicit width and lets height scale automatically', () => {
        const html = wrapEmailTemplate('<p>Hello</p>');
        expect(html).toContain('width="180"');
        expect(html).toContain('height: auto');
    });

    it('includes the original body content unchanged', () => {
        const html = wrapEmailTemplate('<p>Specific unique body text</p>');
        expect(html).toContain('<p>Specific unique body text</p>');
    });
});