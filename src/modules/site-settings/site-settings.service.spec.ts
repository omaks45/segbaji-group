import { SiteSettingsService } from './site-settings.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { SINGLETON_ID } from '../../common/constants/singleton.constant';

function buildMockPrisma() {
    return { siteSettings: { findUnique: jest.fn(), upsert: jest.fn() } } as unknown as PrismaService;
    }

    describe('SiteSettingsService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let service: SiteSettingsService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        service = new SiteSettingsService(prisma);
    });

    describe('find', () => {
        it('returns all-null defaults when nothing has been configured', async () => {
        (prisma.siteSettings.findUnique as jest.Mock).mockResolvedValue(null);
        const result = await service.find();
        expect(result.officeAddress).toBeNull();
        expect(result.missionStatement).toBeNull();
        });

        it('returns the stored row when one exists', async () => {
        (prisma.siteSettings.findUnique as jest.Mock).mockResolvedValue({
            id: SINGLETON_ID, officeAddress: '26A Adeshina Street',
        });
        const result = await service.find();
        expect(result.officeAddress).toBe('26A Adeshina Street');
        });
    });

    describe('update', () => {
        it('upserts against the fixed singleton ID', async () => {
        (prisma.siteSettings.upsert as jest.Mock).mockResolvedValue({});
        await service.update({ email: 'segbaji76@gmail.com' } as never);
        expect(prisma.siteSettings.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: SINGLETON_ID } }),
        );
        });
    });
});