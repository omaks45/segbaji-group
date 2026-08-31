import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContactMessagesService } from './contact-message.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { MailService } from '../mail/mail.service';
import type { ConfigService } from '@nestjs/config';
import type { ClientsService } from '../clients/clients.service';

function buildMockPrisma() {
    return {
        contactMessage: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        },
        $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
    } as unknown as PrismaService;
    }

    describe('ContactMessagesService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let mail: MailService;
    let config: ConfigService;
    let clientsService: ClientsService;
    let service: ContactMessagesService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        mail = { sendMail: jest.fn().mockResolvedValue(undefined) } as unknown as MailService;
        config = { get: jest.fn().mockReturnValue('admin@segbajison.com') } as unknown as ConfigService;
        clientsService = { findOrCreateFromLead: jest.fn() } as unknown as ClientsService;
        service = new ContactMessagesService(prisma, mail, config, clientsService);
    });

    describe('create', () => {
        it('creates the message and sends both admin and visitor emails', async () => {
        (prisma.contactMessage.create as jest.Mock).mockResolvedValue({ id: 'cm1' });
        const result = await service.create({
            fullName: 'Jane', email: 'jane@example.com', message: 'x'.repeat(10),
        } as never);

        expect(mail.sendMail).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ message: expect.any(String), id: 'cm1' });
        });
    });

    describe('findOne — read-marking behavior', () => {
        it('flips an UNREAD message to READ on first view', async () => {
        (prisma.contactMessage.findUnique as jest.Mock).mockResolvedValue({ id: 'cm1', status: 'UNREAD' });
        (prisma.contactMessage.update as jest.Mock).mockResolvedValue({ id: 'cm1', status: 'READ' });

        const result = await service.findOne('cm1');
        expect(result.status).toBe('READ');
        expect(prisma.contactMessage.update).toHaveBeenCalledWith({
            where: { id: 'cm1' }, data: { status: 'READ' },
        });
        });

        it('does not re-write status on a message that is already READ', async () => {
        (prisma.contactMessage.findUnique as jest.Mock).mockResolvedValue({ id: 'cm1', status: 'READ' });

        const result = await service.findOne('cm1');
        expect(result.status).toBe('READ');
        expect(prisma.contactMessage.update).not.toHaveBeenCalled();
        });

        it('does not re-write status on a RESPONDED message either', async () => {
        (prisma.contactMessage.findUnique as jest.Mock).mockResolvedValue({ id: 'cm1', status: 'RESPONDED' });
        await service.findOne('cm1');
        expect(prisma.contactMessage.update).not.toHaveBeenCalled();
        });

        it('throws NotFoundException for a missing message', async () => {
        (prisma.contactMessage.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
        });
    });

    describe('convertToClient', () => {
        it('rejects converting an already-converted message', async () => {
        (prisma.contactMessage.findUnique as jest.Mock).mockResolvedValue({
            id: 'cm1', convertedToClientId: 'client1',
        });
        await expect(service.convertToClient('cm1')).rejects.toThrow(BadRequestException);
        });

        it('dedups against an existing client by email', async () => {
        (prisma.contactMessage.findUnique as jest.Mock).mockResolvedValue({
            id: 'cm1', convertedToClientId: null, fullName: 'Jane', email: 'jane@example.com', phone: null,
        });
        (clientsService.findOrCreateFromLead as jest.Mock).mockResolvedValue({
            client: { id: 'sharedClient' }, created: false,
        });
        (prisma.contactMessage.update as jest.Mock).mockResolvedValue({});

        const result = await service.convertToClient('cm1');
        expect(result).toEqual({ message: 'Linked to existing client', clientId: 'sharedClient', created: false });
        });
    });
});