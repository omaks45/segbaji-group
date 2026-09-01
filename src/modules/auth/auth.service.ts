import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { hashToken } from '../../common/crypto/hash-token.util';
import { MailService } from '../../modules/mail/mail.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const INVITE_TOKEN_TTL_HOURS = 72;
const RESET_TOKEN_TTL_HOURS = 1;

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------- invite flow (unchanged) ----------

  async inviteUser(dto: InviteUserDto) {
    const [role, department] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: dto.roleId } }),
      this.prisma.department.findUnique({ where: { id: dto.departmentId } }),
    ]);
    if (!role || !role.isActive) throw new BadRequestException('roleId does not match an active role');
    if (!department || !department.isActive) throw new BadRequestException('departmentId does not match an active department');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing && existing.status !== 'PENDING') {
      throw new BadRequestException('A user with this email already has an active account');
    }

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { roleId: dto.roleId, departmentId: dto.departmentId, invitedAt: new Date() },
        })
      : await this.prisma.user.create({
          data: { email: dto.email, roleId: dto.roleId, departmentId: dto.departmentId, status: 'PENDING', invitedAt: new Date() },
        });

    await this.issueInviteToken(user.id, dto.email, role.name, department.name);
    return { message: 'Invite sent', userId: user.id };
  }

  async resendInvite(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true, department: true } });
    if (!user) throw new NotFoundException('Team member not found');
    if (user.status !== 'PENDING') throw new BadRequestException('Only pending invites can be resent');
    if (!user.role || !user.department) throw new BadRequestException('This user is missing a role or department — cannot resend invite');

    await this.prisma.user.update({ where: { id: userId }, data: { invitedAt: new Date() } });
    await this.issueInviteToken(user.id, user.email, user.role.name, user.department.name);
    return { message: 'Invite resent' };
  }

  private async issueInviteToken(userId: string, email: string, roleName: string, departmentName: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.inviteToken.upsert({
      where: { userId },
      update: { token, expiresAt, acceptedAt: null },
      create: { userId, token, expiresAt },
    });

    const acceptUrl = `${this.config.get<string>('appUrl')}/invite/accept?token=${token}`;
    await this.mail.sendMail(
      email,
      "You've been invited to Segbaji & Son",
      `<p>You've been invited to join the Segbaji & Son admin portal as a <strong>${roleName}</strong> in <strong>${departmentName}</strong>.</p>
       <p><a href="${acceptUrl}">Complete your registration</a> — this link expires in ${INVITE_TOKEN_TTL_HOURS} hours.</p>`,
    );
  }

  async validateInviteToken(token: string) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token },
      include: { user: { select: { email: true, status: true } } },
    });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite link is invalid or has expired');
    }
    return { email: invite.user.email };
  }

  async completeRegistration(token: string, dto: CompleteRegistrationDto) {
    const invite = await this.prisma.inviteToken.findUnique({ where: { token } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: invite.userId },
          data: { fullName: dto.fullName, phone: dto.phone, passwordHash, status: 'ACTIVE', joinedAt: new Date() },
        }),
        this.prisma.inviteToken.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('This phone number is already registered to another account');
      }
      throw err;
    }

    return { message: 'Registration complete — you can now log in' };
  }

  // ---------- login / sessions (new logic) ----------

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, include: { role: true } });

    if (!user || !user.passwordHash) {
      await this.recordLoginActivity({ email: dto.email, userId: user?.id, success: false, reason: 'invalid_credentials', ...meta });
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== 'ACTIVE') {
      await this.recordLoginActivity({ email: dto.email, userId: user.id, success: false, reason: 'account_inactive', ...meta });
      throw new UnauthorizedException('Account is not active yet — complete your invite or contact an admin');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      await this.recordLoginActivity({ email: dto.email, userId: user.id, success: false, reason: 'invalid_credentials', ...meta });
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.recordLoginActivity({ email: dto.email, userId: user.id, success: true, ...meta });
    const { accessToken, refreshToken } = await this.issueTokenPair(user, meta);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role?.name ?? null },
    };
  }

  async refreshTokens(refreshToken: string, meta: RequestMeta) {
    const refreshTokenHash = hashToken(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid, expired, or revoked');
    }
    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Rotation: replace the token on the SAME session row rather than
    // creating a new one — keeps "Active Sessions" showing one stable
    // entry per device, not a new row every time the app refreshes.
    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    const refreshTtlDays = this.config.get<number>('jwt.refreshTtlDays')!;
    const newExpiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: hashToken(newRefreshToken),
        expiresAt: newExpiresAt,
        lastUsedAt: new Date(),
        ...(meta.ipAddress && { ipAddress: meta.ipAddress }),
        ...(meta.userAgent && { userAgent: meta.userAgent }),
      },
    });

    const accessToken = this.jwt.sign({
      sub: session.user.id,
      role: session.user.role?.name ?? null,
      permissions: session.user.role?.permissions ?? [],
      sessionId: session.id,
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(sessionId: string) {
    await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    return { message: 'Logged out' };
  }

  private async issueTokenPair(
    user: { id: string; role: { name: string; permissions: string[] } | null },
    meta: RequestMeta,
  ) {
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshTtlDays = this.config.get<number>('jwt.refreshTtlDays')!;
    const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashToken(refreshToken),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });

    const accessToken = this.jwt.sign({
      sub: user.id,
      role: user.role?.name ?? null,
      permissions: user.role?.permissions ?? [],
      sessionId: session.id,
    });

    return { accessToken, refreshToken };
  }

  /** Logged for every login attempt, success or failure — the audit
   * trail didn't exist at all before this. userId is captured when
   * known, but the attempt is still logged (by email) even for an
   * unrecognized address, since that's exactly the signal a
   * brute-force sweep would produce. */
  private async recordLoginActivity(input: {
    email: string;
    userId?: string;
    success: boolean;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    await this.prisma.loginActivity.create({
      data: {
        email: input.email,
        userId: input.userId,
        success: input.success,
        reason: input.reason,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  // ---------- password reset (unchanged) ----------

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && user.status === 'ACTIVE') {
      await this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);
      await this.prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });

      const resetUrl = `${this.config.get<string>('appUrl')}/reset-password?token=${token}`;
      await this.mail.sendMail(
        email,
        'Reset your Segbaji & Son password',
        `<p>Click below to reset your password. This link expires in ${RESET_TOKEN_TTL_HOURS} hour.</p>
         <p><a href="${resetUrl}">Reset password</a></p>
         <p>If you didn't request this, you can ignore this email.</p>`,
      );
    }

    return { message: 'If that email has an account, a reset link has been sent' };
  }

  async resetPassword(token: string, dto: ResetPasswordDto) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    ]);

    // A password reset is a real security event — revoke every
    // existing session, since a leaked password (the reason for the
    // reset) may already have live sessions attached to it.
    await this.prisma.session.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password reset — you can now log in with your new password' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, phone: true, bio: true,
        profilePictureUrl: true, status: true, joinedAt: true,
        role: { select: { name: true } },
        department: { select: { name: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}