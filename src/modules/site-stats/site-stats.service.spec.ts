import { SiteStatsService } from './site-stats.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import { SINGLETON_ID } from '../../common/constants/singleton.constant';

function buildMockPrisma() {
    return { siteStat: { findUnique: jest.fn(), upsert: jest.fn() } } as unknown as PrismaService;
    }

    describe('SiteStatsService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let service: SiteStatsService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        service = new SiteStatsService(prisma);
    });

    describe('find', () => {
        it('returns defaults when nothing has ever been set', async () => {
        (prisma.siteStat.findUnique as jest.Mock).mockResolvedValue(null);
        const result = await service.find();
        expect(result).toEqual(expect.objectContaining({ yearsOfExperience: 0, skilledProfessionals: 0 }));
        });

        it('returns the stored row when one exists', async () => {
        (prisma.siteStat.findUnique as jest.Mock).mockResolvedValue({ id: SINGLETON_ID, yearsOfExperience: 15 });
        const result = await service.find();
        expect(result.yearsOfExperience).toBe(15);
        });
    });

    describe('update', () => {
        it('upserts against the fixed singleton ID', async () => {
        (prisma.siteStat.upsert as jest.Mock).mockResolvedValue({ id: SINGLETON_ID, yearsOfExperience: 16 });
        await service.update({ yearsOfExperience: 16 } as never);
        expect(prisma.siteStat.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: SINGLETON_ID } }),
        );
        });

        it('a partial update only touches the fields given, not the whole row', async () => {
        (prisma.siteStat.upsert as jest.Mock).mockResolvedValue({});
        await service.update({ yearsOfExperience: 16 } as never);
        const callArgs = (prisma.siteStat.upsert as jest.Mock).mock.calls[0][0];
        expect(callArgs.update).toEqual({ yearsOfExperience: 16 });
        });
    });
});