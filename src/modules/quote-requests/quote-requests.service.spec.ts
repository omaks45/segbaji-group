import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuoteRequestsService } from './quote-requests.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { MailService } from '../mail/mail.service';
import type { ConfigService } from '@nestjs/config';
import type { ClientsService } from '../clients/clients.service';

function buildMockPrisma() {
    return {
        service: { findUnique: jest.fn() },
        quoteRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        update: jest.fn(),
        },
        $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
    } as unknown as PrismaService;
    }

    describe('QuoteRequestsService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let mail: MailService;
    let config: ConfigService;
    let clientsService: ClientsService;
    let service: QuoteRequestsService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        mail = { sendMail: jest.fn().mockResolvedValue(undefined) } as unknown as MailService;
        config = { get: jest.fn().mockReturnValue('admin@segbajison.com') } as unknown as ConfigService;
        clientsService = { findOrCreateFromLead: jest.fn() } as unknown as ClientsService;
        service = new QuoteRequestsService(prisma, mail, config, clientsService);
    });

    describe('create', () => {
        const dto = {
        serviceId: 'svc1', fullName: 'Jane', email: 'jane@example.com', phone: '+2348000000000',
        projectLocation: 'Lagos', budgetRange: '₦20M', desiredStartDate: '2026-11-01', description: 'x'.repeat(20),
        };

        it('rejects a request for a service that does not exist', async () => {
        (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.create(dto as never)).rejects.toThrow(NotFoundException);
        });

        it('rejects a request for an inactive service', async () => {
        (prisma.service.findUnique as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'X', isActive: false });
        await expect(service.create(dto as never)).rejects.toThrow(NotFoundException);
        });

        it('creates the request and sends both admin and visitor emails', async () => {
        (prisma.service.findUnique as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'Construction', isActive: true });
        (prisma.quoteRequest.create as jest.Mock).mockResolvedValue({ id: 'qr1' });

        const result = await service.create(dto as never);

        expect(mail.sendMail).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ message: expect.any(String), id: 'qr1' });
        });

        it('still creates the record even if an email fails to send', async () => {
        (prisma.service.findUnique as jest.Mock).mockResolvedValue({ id: 'svc1', name: 'Construction', isActive: true });
        (prisma.quoteRequest.create as jest.Mock).mockResolvedValue({ id: 'qr1' });
        (mail.sendMail as jest.Mock).mockRejectedValueOnce(new Error('SMTP down'));

        await expect(service.create(dto as never)).rejects.toThrow('SMTP down');
        // Record was still created before the email step failed — worth
        // knowing this is a real gap: the lead is saved, but the admin
        // never gets notified if the first email throws. Flagging rather
        // than silently asserting this is fine.
        expect(prisma.quoteRequest.create).toHaveBeenCalled();
        });
    });

    describe('findSummary', () => {
        it('aggregates status counts', async () => {
        (prisma.quoteRequest.groupBy as jest.Mock).mockResolvedValue([
            { status: 'NEW', _count: 3 },
            { status: 'WON', _count: 1 },
        ]);
        const result = await service.findSummary();
        expect(result).toEqual({ total: 4, new: 3, contacted: 0, won: 1, lost: 0 });
        });
    });

    describe('findOne / updateStatus', () => {
        it('throws NotFoundException for a missing quote request', async () => {
        (prisma.quoteRequest.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
        });

        it('updates status after confirming the record exists', async () => {
        (prisma.quoteRequest.findUnique as jest.Mock).mockResolvedValue({ id: 'qr1', service: { name: 'X' } });
        (prisma.quoteRequest.update as jest.Mock).mockResolvedValue({ id: 'qr1', status: 'CONTACTED' });

        const result = await service.updateStatus('qr1', { status: 'CONTACTED' } as never);
        expect(result.status).toBe('CONTACTED');
        });
    });

    describe('convertToClient', () => {
        it('throws NotFoundException for a missing quote request', async () => {
        (prisma.quoteRequest.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.convertToClient('missing')).rejects.toThrow(NotFoundException);
        });

        it('rejects converting an already-converted quote request', async () => {
        (prisma.quoteRequest.findUnique as jest.Mock).mockResolvedValue({
            id: 'qr1', convertedToClientId: 'client1',
        });
        await expect(service.convertToClient('qr1')).rejects.toThrow(BadRequestException);
        });

        it('creates a new client when none exists for the email', async () => {
        (prisma.quoteRequest.findUnique as jest.Mock).mockResolvedValue({
            id: 'qr1', convertedToClientId: null, fullName: 'Jane', email: 'jane@example.com', phone: '+234',
        });
        (clientsService.findOrCreateFromLead as jest.Mock).mockResolvedValue({
            client: { id: 'client1' }, created: true,
        });
        (prisma.quoteRequest.update as jest.Mock).mockResolvedValue({});

        const result = await service.convertToClient('qr1');

        expect(result).toEqual({ message: 'Client created and linked', clientId: 'client1', created: true });
        expect(prisma.quoteRequest.update).toHaveBeenCalledWith({
            where: { id: 'qr1' },
            data: { convertedToClientId: 'client1' },
        });
        });

        it('links to an existing client instead of duplicating', async () => {
        (prisma.quoteRequest.findUnique as jest.Mock).mockResolvedValue({
            id: 'qr1', convertedToClientId: null, fullName: 'Jane', email: 'jane@example.com', phone: '+234',
        });
        (clientsService.findOrCreateFromLead as jest.Mock).mockResolvedValue({
            client: { id: 'existingClient' }, created: false,
        });
        (prisma.quoteRequest.update as jest.Mock).mockResolvedValue({});

        const result = await service.convertToClient('qr1');
        expect(result.created).toBe(false);
        expect(result.clientId).toBe('existingClient');
        });
    });
});