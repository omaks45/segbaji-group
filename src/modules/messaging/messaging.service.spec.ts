import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationType } from '../../generated/prisma/client';
import { MessagingService } from './messaging.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

function buildMockPrisma() {
  return {
    user: { count: jest.fn() },
    conversation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    conversationParticipant: { findUnique: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
    message: { create: jest.fn(), count: jest.fn(), findMany: jest.fn(), findUniqueOrThrow: jest.fn() },
    messageAttachment: { create: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
  } as unknown as PrismaService;
}

describe('MessagingService', () => {
  let prisma: ReturnType<typeof buildMockPrisma>;
  let service: MessagingService;

  beforeEach(() => {
    prisma = buildMockPrisma();
    service = new MessagingService(prisma, {} as CloudinaryService);
  });

  describe('createConversation — DIRECT dedup', () => {
    it('rejects a DIRECT conversation request listing more than one other participant', async () => {
      await expect(
        service.createConversation({ type: ConversationType.DIRECT, participantIds: ['a', 'b'] } as never, 'me'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns an existing DIRECT conversation instead of creating a duplicate', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(2);
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-convo' });

      const result = await service.createConversation(
        { type: ConversationType.DIRECT, participantIds: ['userB'] } as never,
        'userA',
      );

      expect(result).toEqual({ id: 'existing-convo' });
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('creates a new DIRECT conversation when none exists yet', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(2);
      (prisma.conversation.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.conversation.create as jest.Mock).mockResolvedValue({ id: 'new-convo' });

      const result = await service.createConversation(
        { type: ConversationType.DIRECT, participantIds: ['userB'] } as never,
        'userA',
      );

      expect(result).toEqual({ id: 'new-convo' });
    });

    it('rejects starting a conversation with yourself', async () => {
      await expect(
        service.createConversation({ type: ConversationType.DIRECT, participantIds: ['me'] } as never, 'me'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if either user does not exist', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(1);
      await expect(
        service.createConversation({ type: ConversationType.DIRECT, participantIds: ['ghost'] } as never, 'userA'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createConversation — GROUP', () => {
    it('requires a name for GROUP conversations', async () => {
      await expect(
        service.createConversation({ type: ConversationType.GROUP, participantIds: ['a', 'b'] } as never, 'me'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deduplicates the creator if they were also listed in participantIds', async () => {
      (prisma.conversation.create as jest.Mock).mockResolvedValue({ id: 'group1' });

      await service.createConversation(
        { type: ConversationType.GROUP, name: 'Team Chat', participantIds: ['me', 'other1', 'other2'] } as never,
        'me',
      );

      const callArgs = (prisma.conversation.create as jest.Mock).mock.calls[0][0];
      expect(callArgs.data.participants.create).toHaveLength(3); // not 4 — "me" wasn't duplicated
    });
  });

  describe('sendMessage', () => {
    it('rejects a non-participant trying to send into a conversation', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.sendMessage('convo1', 'notAMember')).rejects.toThrow(ForbiddenException);
    });

    it('rejects an empty message with no content and no attachments', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
      await expect(service.sendMessage('convo1', 'member1')).rejects.toThrow(BadRequestException);
    });

    it('rejects attaching a file the sender did not upload themselves', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
      (prisma.messageAttachment.count as jest.Mock).mockResolvedValue(0); // owned count doesn't match requested count
      await expect(
        service.sendMessage('convo1', 'member1', undefined, ['someone-elses-attachment']),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMessages — read receipt calculation', () => {
    it('marks a message as read only when every OTHER participant has read past it', async () => {
      (prisma.conversationParticipant.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
      (prisma.conversationParticipant.findMany as jest.Mock).mockResolvedValue([
        { userId: 'sender', lastReadAt: null },
        { userId: 'recipient', lastReadAt: new Date('2026-01-02') },
      ]);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([
        { id: 'm1', senderId: 'sender', createdAt: new Date('2026-01-01'), sender: {}, attachments: [] },
        { id: 'm2', senderId: 'sender', createdAt: new Date('2026-01-03'), sender: {}, attachments: [] },
      ]);

      const result = await service.getMessages('convo1', 'sender', 1, 30);

      const m1 = result.find((m) => m.id === 'm1');
      const m2 = result.find((m) => m.id === 'm2');
      expect(m1?.isRead).toBe(true); // recipient's lastReadAt (Jan 2) is after this message (Jan 1)
      expect(m2?.isRead).toBe(false); // recipient's lastReadAt (Jan 2) is BEFORE this message (Jan 3)
    });
  });
});