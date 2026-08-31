import { NotFoundException } from '@nestjs/common';
import { PageKey } from '../../generated/prisma/client';
import { SeoMetaService } from './seo-meta.service';
import type { PrismaService } from '../../common/prisma/prisma.service';

function buildMockPrisma() {
    return { seoMeta: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() } } as unknown as PrismaService;
    }

    describe('SeoMetaService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let service: SeoMetaService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        service = new SeoMetaService(prisma);
    });

    describe('findOne', () => {
        it('throws NotFoundException when a page has no metadata configured yet', async () => {
        (prisma.seoMeta.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.findOne(PageKey.PROPERTIES)).rejects.toThrow(NotFoundException);
        });

        it('returns the metadata when it exists', async () => {
        (prisma.seoMeta.findUnique as jest.Mock).mockResolvedValue({
            pageKey: PageKey.HOME, title: 'Segbaji & Son', description: 'x',
        });
        const result = await service.findOne(PageKey.HOME);
        expect(result.pageKey).toBe(PageKey.HOME);
        });
    });

    describe('upsert', () => {
        it('creates or updates keyed by pageKey', async () => {
        (prisma.seoMeta.upsert as jest.Mock).mockResolvedValue({ pageKey: PageKey.HOME });
        await service.upsert(PageKey.HOME, { title: 'X', description: 'Y' } as never);
        expect(prisma.seoMeta.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { pageKey: PageKey.HOME } }),
        );
        });
    });
});