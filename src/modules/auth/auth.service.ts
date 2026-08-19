import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../../modules/mail/mail.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const INVITE_TOKEN_TTL_HOURS = 72;
const RESET_TOKEN_TTL_HOURS = 1;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async inviteUser(dto: InviteUserDto) {
    const [role, department] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: dto.roleId } }),
      this.prisma.department.findUnique({ where: { id: dto.departmentId } }),
    ]);
    if (!role) throw new BadRequestException('roleId does not match an existing role');
    if (!department) throw new BadRequestException('departmentId does not match an existing department');

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing && existing.status !== 'PENDING') {
      throw new BadRequestException('A user with this email already has an active account');
    }

    // Resending to a still-pending invite reuses the same user row and
    // just issues a fresh token — avoids a duplicate-email error and
    // matches what an admin actually means by "invite again."
    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: { roleId: dto.roleId, departmentId: dto.departmentId, invitedAt: new Date() },
        })
      : await this.prisma.user.create({
          data: {
            email: dto.email,
            roleId: dto.roleId,
            departmentId: dto.departmentId,
            status: 'PENDING',
            invitedAt: new Date(),
          },
        });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    await this.prisma.inviteToken.upsert({
      where: { userId: user.id },
      update: { token, expiresAt, acceptedAt: null },
      create: { userId: user.id, token, expiresAt },
    });

    const acceptUrl = `${this.config.get<string>('appUrl')}/invite/accept?token=${token}`;
    await this.mail.sendMail(
      dto.email,
      "You've been invited to Segbaji & Son",
      `<p>You've been invited to join the Segbaji & Son admin portal as a <strong>${role.name}</strong> in <strong>${department.name}</strong>.</p>
       <p><a href="${acceptUrl}">Complete your registration</a> — this link expires in ${INVITE_TOKEN_TTL_HOURS} hours.</p>`,
    );

    return { message: 'Invite sent', userId: user.id };
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

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: invite.userId },
        data: {
          fullName: dto.fullName,
          phone: dto.phone,
          passwordHash,
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      }),
      this.prisma.inviteToken.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    return { message: 'Registration complete — you can now log in' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    // Same generic error whether the email doesn't exist or the password
    // is wrong — don't help an attacker enumerate valid accounts.
    const invalidCredentials = () => new UnauthorizedException('Invalid email or password');

    if (!user || !user.passwordHash) throw invalidCredentials();
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active yet — complete your invite or contact an admin');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw invalidCredentials();

    const accessToken = this.jwt.sign({ sub: user.id, role: user.role?.name ?? null });

    return {
      accessToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role?.name ?? null,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always the same response, whether or not the email exists — an
    // attacker shouldn't be able to use this endpoint to find out which
    // emails have accounts.
    if (user && user.status === 'ACTIVE') {
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }, // invalidate any earlier unused tokens
      });

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);
      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      });

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
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

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