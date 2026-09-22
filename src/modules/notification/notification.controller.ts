import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notification.service';
import { NotificationsQueryDto } from './dto/notification-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';

// No permission gate beyond being logged in — every staff account has
// their own notifications, same as /dashboard/me and /users/me. There is
// no "admin viewing someone else's notifications" endpoint; each user
// only ever sees rows where recipientId === their own id, enforced in the
// service layer, not just by which routes exist.

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: "List the caller's own notifications, paginated, newest first" })
  @Get()
  findMine(@CurrentUser() user: JwtPayload, @Query() query: NotificationsQueryDto) {
    return this.notificationsService.findMine(user.sub, query);
  }

  @ApiOperation({ summary: 'Get the unread count for the bell badge — cheap, call this on a light poll interval as a fallback to the WebSocket push' })
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.getUnreadCount(user.sub);
  }

  @ApiOperation({ summary: 'Mark one notification as read' })
  @Patch(':id/read')
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificationsService.markRead(user.sub, id);
  }

  @ApiOperation({ summary: 'Mark all of the caller\'s notifications as read' })
  @Patch('read-all')
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user.sub);
  }
}