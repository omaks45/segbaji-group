import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientSource, Prisma } from '../../generated/prisma/client';
import { ClientsService } from './clients.service';
import type { PrismaService } from '../../common/prisma/prisma.service';

function buildMockPrisma() {
  return {
    client: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
  } as unknown as PrismaService;
}

describe('ClientsService', () => {
  let prisma: ReturnType<typeof buildMockPrisma>;
  let service: ClientsService;

  beforeEach(() => {
    prisma = buildMockPrisma();
    service = new ClientsService(prisma);
  });

  describe('create', () => {
    it('creates a client with source MANUAL regardless of what was passed in', async () => {
      (prisma.client.create as jest.Mock).mockResolvedValue({ id: '1', source: ClientSource.MANUAL });
      await service.create({ fullName: 'Walk-in', email: 'walkin@example.com' } as never);

      expect(prisma.client.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ source: ClientSource.MANUAL }),
      });
    });

    it('translates a duplicate email into ConflictException', async () => {
      const err = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '7.9.1' });
      (prisma.client.create as jest.Mock).mockRejectedValue(err);
      await expect(
        service.create({ fullName: 'X', email: 'dup@example.com' } as never),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOrCreateFromLead — the core dedup logic', () => {
    it('returns the existing client when the email already exists, without creating a new one', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue({ id: 'existing', email: 'jane@example.com' });

      const result = await service.findOrCreateFromLead({
        fullName: 'Jane', email: 'jane@example.com', source: ClientSource.QUOTE_REQUEST,
      });

      expect(result).toEqual({ client: { id: 'existing', email: 'jane@example.com' }, created: false });
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('creates a new client when no existing one matches the email', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.client.create as jest.Mock).mockResolvedValue({ id: 'new1', email: 'new@example.com' });

      const result = await service.findOrCreateFromLead({
        fullName: 'New Person', email: 'new@example.com', source: ClientSource.CONTACT_MESSAGE,
      });

      expect(result).toEqual({ client: { id: 'new1', email: 'new@example.com' }, created: true });
    });

    it('resolves a race condition by linking to the winning record instead of throwing', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);
      const raceErr = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '7.9.1' });
      (prisma.client.create as jest.Mock).mockRejectedValue(raceErr);
      (prisma.client.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: 'wonRace', email: 'racer@example.com' });

      const result = await service.findOrCreateFromLead({
        fullName: 'Racer', email: 'racer@example.com', source: ClientSource.QUOTE_REQUEST,
      });

      expect(result).toEqual({ client: { id: 'wonRace', email: 'racer@example.com' }, created: false });
    });

    it('rethrows a non-conflict error rather than silently swallowing it', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.client.create as jest.Mock).mockRejectedValue(new Error('connection lost'));

      await expect(
        service.findOrCreateFromLead({ fullName: 'X', email: 'x@example.com', source: ClientSource.MANUAL }),
      ).rejects.toThrow('connection lost');
    });
  });

  describe('findOne / update', () => {
    it('throws NotFoundException for a missing client', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException on update for a missing client', async () => {
      (prisma.client.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.update('missing', {} as never)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findSummary', () => {
    it('computes inactive as total minus active', async () => {
      (prisma.client.count as jest.Mock).mockResolvedValueOnce(10).mockResolvedValueOnce(7);
      const result = await service.findSummary();
      expect(result).toEqual({ total: 10, active: 7, inactive: 3 });
    });
  });
});