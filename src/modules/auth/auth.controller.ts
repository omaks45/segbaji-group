import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  InviteResponseDto,
  LoginResponseDto,
  MessageResponseDto,
  ValidateInviteResponseDto,
} from './dto/auth-responses.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Invite a new team member by email, role, and department' })
  @ApiResponse({ status: 201, type: InviteResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token' })
  @ApiResponse({ status: 403, description: 'Missing team:write permission' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.TEAM_WRITE)
  @Post('invite')
  invite(@Body() dto: InviteUserDto) {
    return this.authService.inviteUser(dto);
  }

  @ApiOperation({ summary: 'Check whether an invite token is still valid' })
  @ApiResponse({ status: 200, type: ValidateInviteResponseDto })
  @ApiResponse({ status: 400, description: 'Invite is invalid or expired' })
  @Get('invite/:token')
  validateInvite(@Param('token') token: string) {
    return this.authService.validateInviteToken(token);
  }

  @ApiOperation({ summary: 'Complete registration from an invite link' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invite is invalid or expired' })
  @Post('invite/:token/accept')
  acceptInvite(@Param('token') token: string, @Body() dto: CompleteRegistrationDto) {
    return this.authService.completeRegistration(token, dto);
  }

  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @ApiOperation({ summary: 'Reset password using a token from the reset email' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Reset link is invalid or expired' })
  @Post('reset-password/:token')
  resetPassword(@Param('token') token: string, @Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(token, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Get the logged-in user's own profile" })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }
}