import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CoreValuesService } from './core-values.service';
import type { PrismaService } from '../../common/prisma/prisma.service';

function buildMockPrisma() {
    return {
        coreValue: {
        findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(),
        update: jest.fn(), delete: jest.fn(), aggregate: jest.fn(),
        },
        $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
    } as unknown as PrismaService;
    }

    describe('CoreValuesService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let service: CoreValuesService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        service = new CoreValuesService(prisma);
    });

    describe('create', () => {
        it('places the first value at order 0', async () => {
        (prisma.coreValue.aggregate as jest.Mock).mockResolvedValue({ _max: { order: null } });
        (prisma.coreValue.create as jest.Mock).mockResolvedValue({ id: '1', order: 0 });
        await service.create({ title: 'Integrity' } as never);
        expect(prisma.coreValue.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ order: 0 }),
        });
        });
    });

    describe('update / remove', () => {
        it('throws NotFoundException on update for a missing value', async () => {
        (prisma.coreValue.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.update('missing', {} as never)).rejects.toThrow(NotFoundException);
        });

        it('throws NotFoundException on remove for a missing value', async () => {
        (prisma.coreValue.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
        });

        it('actually deletes the row (hard delete, no isActive flag)', async () => {
        (prisma.coreValue.findUnique as jest.Mock).mockResolvedValue({ id: '1' });
        (prisma.coreValue.delete as jest.Mock).mockResolvedValue({});
        await service.remove('1');
        expect(prisma.coreValue.delete).toHaveBeenCalledWith({ where: { id: '1' } });
        });
    });

    describe('reorder', () => {
        it('rejects a mismatched ID set', async () => {
        (prisma.coreValue.findMany as jest.Mock).mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }]);
        await expect(service.reorder({ coreValueIds: ['1', '2'] } as never)).rejects.toThrow(BadRequestException);
        });
    });
});