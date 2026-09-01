import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { InviteResponseDto, LoginResponseDto, MessageResponseDto, ValidateInviteResponseDto } from './dto/auth-responses.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Invite a new team member by email, role, and department' })
  @ApiResponse({ status: 201, type: InviteResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.TEAM_WRITE)
  @Post('invite')
  invite(@Body() dto: InviteUserDto) {
    return this.authService.inviteUser(dto);
  }

  @ApiOperation({ summary: 'Check whether an invite token is still valid' })
  @ApiResponse({ status: 200, type: ValidateInviteResponseDto })
  @Get('invite/:token')
  validateInvite(@Param('token') token: string) {
    return this.authService.validateInviteToken(token);
  }

  @ApiOperation({ summary: 'Complete registration from an invite link' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @Post('invite/:token/accept')
  acceptInvite(@Param('token') token: string, @Body() dto: CompleteRegistrationDto) {
    return this.authService.completeRegistration(token, dto);
  }

  @ApiOperation({ summary: 'Log in with email and password — returns a short-lived access token and a refresh token' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  }

  @ApiOperation({ summary: 'Exchange a refresh token for a new access token (rotates the refresh token)' })
  @ApiResponse({ status: 201, type: LoginResponseDto })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshTokens(dto.refreshToken, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Log out — revokes the current session' })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sessionId);
  }

  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @ApiOperation({ summary: 'Reset password using a token from the reset email' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
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