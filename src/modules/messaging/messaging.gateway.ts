import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { TokenValidatorService } from '../auth/token-validator.service';
import { MessagingService } from './messaging.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';
import { EditMessageDto } from './dto/edit-message.dto';
import { AddParticipantsDto } from './dto/add-participants.dto';

interface AuthenticatedSocket extends Socket {
    data: { user: JwtPayload };
}

/**
 * Known limitation, flagged rather than silently assumed away: this
 * uses Socket.IO's default in-memory adapter. That's fine on a single
 * Render instance (what this app runs today) — if this service is ever
 * scaled to multiple instances, broadcasts only reach clients connected
 * to the SAME instance, and a Redis-backed adapter (@socket.io/redis-adapter,
 * using the Redis you already have) becomes necessary. Not needed yet.
 */
@WebSocketGateway({
    cors: {
        origin: (process.env.CORS_ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
        credentials: true,
    },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server!: Server;
    private readonly logger = new Logger(MessagingGateway.name);

    constructor(
        private readonly tokenValidator: TokenValidatorService,
        private readonly messagingService: MessagingService,
        private readonly prisma: PrismaService,
    ) {}

    async handleConnection(client: Socket) {
        const rawToken =
        (client.handshake.auth?.token as string | undefined) ??
        client.handshake.headers.authorization?.replace('Bearer ', '') ??
        (client.handshake.query?.token as string | undefined);

        if (!rawToken) {
        client.disconnect(true);
        return;
        }

        try {
        const payload = await this.tokenValidator.validate(rawToken);
        (client as AuthenticatedSocket).data.user = payload;

        // Auto-join a room per conversation this user belongs to — the
        // client doesn't need to manually "join" each thread, it just
        // starts receiving events for everything it's already part of.
        const memberships = await this.prisma.conversationParticipant.findMany({
            where: { userId: payload.sub },
            select: { conversationId: true },
        });
        memberships.forEach((m) => client.join(`conversation:${m.conversationId}`));
        } catch (err) {
        this.logger.warn(`WebSocket auth failed: ${(err as Error).message}`);
        client.disconnect(true);
        }
    }

    handleDisconnect() {
        // No cleanup needed — Socket.IO removes the socket from all rooms automatically on disconnect.
    }

    @SubscribeMessage('sendMessage')
    async handleSendMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string; content?: string; attachmentIds?: string[] },
    ) {
        const message = await this.messagingService.sendMessage(
        data.conversationId,
        client.data.user.sub,
        data.content,
        data.attachmentIds,
        );
        this.server.to(`conversation:${data.conversationId}`).emit('newMessage', message);
        return message;
    }

    @SubscribeMessage('editMessage')
    async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string } & EditMessageDto,
    ) {
    const message = await this.messagingService.editMessage(data.messageId, client.data.user.sub, {
        content: data.content,
    });
    this.server.to(`conversation:${message.conversationId}`).emit('messageEdited', message);
    return message;
    }

    @SubscribeMessage('deleteMessage')
    async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
    ) {
    const result = await this.messagingService.deleteMessage(data.messageId, client.data.user.sub);
    this.server.to(`conversation:${result.conversationId}`).emit('messageDeleted', {
        messageId: data.messageId,
        conversationId: result.conversationId,
    });
    return result;
    }

    @SubscribeMessage('addParticipants')
    async handleAddParticipants(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string } & AddParticipantsDto,
    ) {
    const result = await this.messagingService.addParticipants(data.conversationId, client.data.user.sub, {
        userIds: data.userIds,
    });
    this.server.to(`conversation:${data.conversationId}`).emit('participantsAdded', {
        conversationId: data.conversationId,
        added: result.added,
    });
    return result;
    }

    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string },
    ) {
        await this.messagingService.markAsRead(data.conversationId, client.data.user.sub);
        // Tells the OTHER participant(s) their sent messages just became
        // "read" — this is what flips the checkmark live on their screen.
        this.server.to(`conversation:${data.conversationId}`).emit('messagesRead', {
        conversationId: data.conversationId,
        readByUserId: client.data.user.sub,
        readAt: new Date(),
        });
    }

    /** Ephemeral only — never persisted, purely relayed to whoever's in the room right now. */
    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { conversationId: string; isTyping: boolean },
    ) {
        client.to(`conversation:${data.conversationId}`).emit('userTyping', {
        userId: client.data.user.sub,
        isTyping: data.isTyping,
        });
    }
}