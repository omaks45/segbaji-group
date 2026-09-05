import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConversationType } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { EditMessageDto } from './dto/edit-message.dto';
import { AddParticipantsDto } from './dto/add-participants.dto';

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async createConversation(dto: CreateConversationDto, creatorId: string) {
    if (dto.type === ConversationType.DIRECT) {
      if (dto.participantIds.length !== 1) {
        throw new BadRequestException('DIRECT conversations need exactly one other participant');
      }
      return this.findOrCreateDirect(creatorId, dto.participantIds[0]);
    }

    if (!dto.name) throw new BadRequestException('name is required for GROUP conversations');

    const allParticipantIds = [...new Set([creatorId, ...dto.participantIds])];
    return this.prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        name: dto.name,
        createdById: creatorId,
        clientId: dto.clientId,
        projectId: dto.projectId,
        participants: { create: allParticipantIds.map((userId) => ({ userId })) },
      },
      include: { participants: { include: { user: { select: { id: true, fullName: true, profilePictureUrl: true } } } } },
    });
  }

  /**
   * Prevents two people accumulating multiple duplicate DM threads.
   * No DB-level unique constraint can express "these exact 2 people,
   * regardless of order" directly, so this is enforced here: look up
   * every DIRECT conversation the first user belongs to, then check
   * which of those the second user is also in.
   */
  private async findOrCreateDirect(userAId: string, userBId: string) {
    if (userAId === userBId) throw new BadRequestException('Cannot start a conversation with yourself');

    const usersExist = await this.prisma.user.count({ where: { id: { in: [userAId, userBId] } } });
    if (usersExist !== 2) throw new NotFoundException('One or both users do not exist');

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        participants: { some: { userId: userAId } },
        AND: { participants: { some: { userId: userBId } } },
      },
      include: { participants: { include: { user: { select: { id: true, fullName: true, profilePictureUrl: true } } } } },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        createdById: userAId,
        participants: { create: [{ userId: userAId }, { userId: userBId }] },
      },
      include: { participants: { include: { user: { select: { id: true, fullName: true, profilePictureUrl: true } } } } },
    });
  }

  async listConversations(userId: string, query: ConversationQueryDto) {
    const memberships = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: { id: true, fullName: true, profilePictureUrl: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            client: { select: { id: true, fullName: true, organization: true } },
            project: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    const rows = await Promise.all(
      memberships.map(async (m) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: m.conversationId,
            senderId: { not: userId },
            createdAt: { gt: m.lastReadAt ?? new Date(0) },
          },
        });
        return {
          id: m.conversation.id,
          type: m.conversation.type,
          name: m.conversation.name,
          client: m.conversation.client,
          project: m.conversation.project,
          participants: m.conversation.participants.map((p) => p.user),
          lastMessage: m.conversation.messages[0] ?? null,
          unreadCount,
        };
      }),
    );

    switch (query.filter) {
      case 'UNREAD':
        return rows.filter((r) => r.unreadCount > 0);
      case 'PROJECT':
        return rows.filter((r) => r.project !== null);
      case 'CLIENT':
        return rows.filter((r) => r.client !== null);
      case 'TEAM':
        return rows.filter((r) => r.type === ConversationType.GROUP);
      default:
        return rows;
    }
  }

  async getMessages(conversationId: string, userId: string, page: number, pageSize: number) {
    await this.assertParticipant(conversationId, userId);

    const participants = await this.prisma.conversationParticipant.findMany({ where: { conversationId } });

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        sender: { select: { id: true, fullName: true, profilePictureUrl: true } },
        attachments: true,
      },
    });

    // "Read" = every OTHER active participant has read past this
    // message's timestamp — matches the double-checkmark convention
    // your screenshot shows, and works the same for DIRECT (1 other
    // person) and GROUP (all other members) without separate logic.
    return messages.reverse().map((msg) => ({
      ...msg,
      isRead: participants
        .filter((p) => p.userId !== msg.senderId)
        .every((p) => p.lastReadAt && p.lastReadAt >= msg.createdAt),
    }));
  }

  async uploadAttachment(file: Express.Multer.File, uploadedById: string) {
    const result = await this.cloudinary.uploadRawBuffer(file.buffer, {
      folder: 'segbaji/messaging-attachments',
      filename: `${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '')}`,
      format: (file.originalname.split('.').pop() as 'csv' | 'xlsx') ?? 'csv',
    });

    // Created with no messageId yet — this attachment exists standalone
    // until sendMessage() links it, mirroring how a chat UI attaches a
    // file to a draft before the message itself is composed and sent.
    return this.prisma.messageAttachment.create({
      data: {
        url: result.url,
        publicId: result.publicId,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedById,
      },
    });
  }

  async sendMessage(conversationId: string, senderId: string, content?: string, attachmentIds: string[] = []) {
    await this.assertParticipant(conversationId, senderId);
    if (!content && attachmentIds.length === 0) {
      throw new BadRequestException('A message needs content or at least one attachment');
    }

    if (attachmentIds.length) {
      // Only let a sender attach files THEY uploaded — prevents linking
      // someone else's uploaded attachment into your own message.
      const owned = await this.prisma.messageAttachment.count({
        where: { id: { in: attachmentIds }, uploadedById: senderId, messageId: null },
      });
      if (owned !== attachmentIds.length) {
        throw new ForbiddenException('One or more attachments are invalid or not yours to use');
      }
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, senderId, content },
        include: { sender: { select: { id: true, fullName: true, profilePictureUrl: true } }, attachments: true },
      }),
      this.prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
    ]);

    if (attachmentIds.length) {
      await this.prisma.messageAttachment.updateMany({
        where: { id: { in: attachmentIds } },
        data: { messageId: message.id },
      });
    }

    return this.prisma.message.findUniqueOrThrow({
      where: { id: message.id },
      include: { sender: { select: { id: true, fullName: true, profilePictureUrl: true } }, attachments: true },
    });
  }

  async editMessage(messageId: string, userId: string, dto: EditMessageDto) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('You can only edit your own messages');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: dto.content, editedAt: new Date() },
      include: { sender: { select: { id: true, fullName: true, profilePictureUrl: true } }, attachments: true },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { attachments: true },
    });
    if (!message || message.deletedAt) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('You can only delete your own messages');

    await this.prisma.$transaction([
      this.prisma.message.update({
        where: { id: messageId },
        data: { content: null, deletedAt: new Date() },
      }),
      this.prisma.messageAttachment.deleteMany({ where: { messageId } }),
    ]);

    // Cloudinary cleanup runs after the DB transaction succeeds, same
    // fire-and-forget pattern as every other asset deletion in this app.
    message.attachments.forEach((att) => void this.cloudinary.deleteAsset(att.publicId));

    return { message: 'Message deleted', conversationId: message.conversationId };
  }

  async addParticipants(conversationId: string, requesterId: string, dto: AddParticipantsDto) {
    const conversation = await this.getGroupConversationOrThrow(conversationId);
    await this.assertParticipant(conversationId, requesterId);

    const existing = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((p) => p.userId));
    const newUserIds = dto.userIds.filter((id) => !existingIds.has(id));

    if (newUserIds.length === 0) {
      return { message: 'All listed users are already participants', added: [] };
    }

    await this.prisma.conversationParticipant.createMany({
      data: newUserIds.map((userId) => ({ conversationId, userId })),
    });

    return { message: 'Participants added', added: newUserIds };
  }

  async leaveConversation(conversationId: string, userId: string) {
    await this.getGroupConversationOrThrow(conversationId);
    await this.assertParticipant(conversationId, userId);

    await this.prisma.conversationParticipant.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });
    return { message: 'You left the conversation' };
  }

  async removeParticipant(conversationId: string, requesterId: string, targetUserId: string) {
    const conversation = await this.getGroupConversationOrThrow(conversationId);
    if (conversation.createdById !== requesterId) {
      throw new ForbiddenException('Only the conversation creator can remove other members');
    }
    if (requesterId === targetUserId) {
      throw new BadRequestException('Use "leave" to remove yourself, not this endpoint');
    }

    const target = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('That user is not a participant in this conversation');

    await this.prisma.conversationParticipant.delete({ where: { id: target.id } });
    return { message: 'Participant removed' };
  }

  private async getGroupConversationOrThrow(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.type !== ConversationType.GROUP) {
      throw new BadRequestException('Membership changes only apply to GROUP conversations');
    }
    return conversation;
  }

  async markAsRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
    return { message: 'Marked as read' };
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this conversation');
  }
}