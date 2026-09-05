import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors, DefaultValuePipe, Patch, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationQueryDto } from './dto/conversation-query.dto';
import { imageUploadOptions } from '../../common/upload/image-upload.options';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { EditMessageDto } from './dto/edit-message.dto';
import { AddParticipantsDto } from './dto/add-participants.dto';

@ApiTags('Messaging')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @ApiOperation({ summary: 'Create a direct (1:1) or group conversation' })
  @Post('conversations')
  createConversation(@Body() dto: CreateConversationDto, @CurrentUser() user: JwtPayload) {
    return this.messagingService.createConversation(dto, user.sub);
  }

  @ApiOperation({ summary: 'List my conversations — filter: ALL/UNREAD/PROJECT/CLIENT/TEAM' })
  @Get('conversations')
  listConversations(@Query() query: ConversationQueryDto, @CurrentUser() user: JwtPayload) {
    return this.messagingService.listConversations(user.sub, query);
  }

  @ApiOperation({ summary: 'Get message history for a conversation, paginated, newest page first' })
  @Get('conversations/:id/messages')
  getMessages(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(30), ParseIntPipe) pageSize: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagingService.getMessages(id, user.sub, page, pageSize);
  }

  @ApiOperation({ summary: 'Send a message (REST fallback — the WebSocket gateway is the primary live path)' })
  @Post('conversations/:id/messages')
  sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto, @CurrentUser() user: JwtPayload) {
    return this.messagingService.sendMessage(id, user.sub, dto.content, dto.attachmentIds);
  }

  @ApiOperation({ summary: 'Mark a conversation read up to now' })
  @Post('conversations/:id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.messagingService.markAsRead(id, user.sub);
  }

  @ApiOperation({ summary: 'Upload a file to attach to a message you compose next' })
  @ApiConsumes('multipart/form-data')
  @Post('attachments')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions(15 * 1024 * 1024))) // 15MB, any file type — this endpoint intentionally skips the image-only check imageUploadOptions was designed for
  uploadAttachment(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload) {
    return this.messagingService.uploadAttachment(file, user.sub);
  }

  @ApiOperation({ summary: 'Edit a message you sent' })
  @Patch('messages/:id')
  editMessage(@Param('id') id: string, @Body() dto: EditMessageDto, @CurrentUser() user: JwtPayload) {
    return this.messagingService.editMessage(id, user.sub, dto);
  }

  @ApiOperation({ summary: 'Delete (tombstone) a message you sent' })
  @Delete('messages/:id')
  deleteMessage(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.messagingService.deleteMessage(id, user.sub);
  }

  @ApiOperation({ summary: 'Add members to a group conversation' })
  @Post('conversations/:id/participants')
  addParticipants(@Param('id') id: string, @Body() dto: AddParticipantsDto, @CurrentUser() user: JwtPayload) {
    return this.messagingService.addParticipants(id, user.sub, dto);
  }

  @ApiOperation({ summary: 'Leave a group conversation' })
  @Delete('conversations/:id/participants/me')
  leaveConversation(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.messagingService.leaveConversation(id, user.sub);
  }

  @ApiOperation({ summary: 'Remove another member (conversation creator only)' })
  @Delete('conversations/:id/participants/:userId')
  removeParticipant(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.messagingService.removeParticipant(id, user.sub, userId);
  }
}