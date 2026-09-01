import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '../../generated/prisma/client';
import { AuthService } from './auth.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { MailService } from '../mail/mail.service';
import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '@nestjs/config';

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

function buildMockPrisma() {
    return {
        role: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
        department: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
        user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        inviteToken: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
        passwordResetToken: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
        session: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
        loginActivity: { create: jest.fn() },
        $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
    } as unknown as PrismaService;
    }

    describe('AuthService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let mail: MailService;
    let jwt: JwtService;
    let config: ConfigService;
    let service: AuthService;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = buildMockPrisma();
        mail = { sendMail: jest.fn().mockResolvedValue(undefined) } as unknown as MailService;
        jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') } as unknown as JwtService;
        config = { get: jest.fn().mockReturnValue('http://localhost:5173') } as unknown as ConfigService;
        (prisma.loginActivity.create as jest.Mock).mockResolvedValue({});
        (prisma.session.create as jest.Mock).mockResolvedValue({ id: 'session1' });
        service = new AuthService(prisma, mail, jwt, config);
    });

    describe('inviteUser', () => {
        const dto = { email: 'new@example.com', roleId: 'role1', departmentId: 'dept1' };

        it('rejects an inactive role', async () => {
        (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role1', name: 'X', isActive: false });
        (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'dept1', isActive: true });

        await expect(service.inviteUser(dto)).rejects.toThrow(BadRequestException);
        });

        it('rejects an inactive department', async () => {
        (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role1', name: 'X', isActive: true });
        (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'dept1', isActive: false });

        await expect(service.inviteUser(dto)).rejects.toThrow(BadRequestException);
        });

        it('rejects inviting an email that already has an ACTIVE account', async () => {
        (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role1', name: 'X', isActive: true });
        (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'dept1', isActive: true });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing', status: 'ACTIVE' });

        await expect(service.inviteUser(dto)).rejects.toThrow(BadRequestException);
        });

        it('re-invites (reuses the row) when the existing account is still PENDING', async () => {
        (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role1', name: 'Site Engineer', isActive: true });
        (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'dept1', name: 'Engineering', isActive: true });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'pendingUser', status: 'PENDING' });
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'pendingUser' });
        (prisma.inviteToken.upsert as jest.Mock).mockResolvedValue({});

        const result = await service.inviteUser(dto);

        expect(prisma.user.create).not.toHaveBeenCalled();
        expect(prisma.user.update).toHaveBeenCalled();
        expect(result).toEqual({ message: 'Invite sent', userId: 'pendingUser' });
        });

        it('creates a new user and sends the invite email when no account exists yet', async () => {
        (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role1', name: 'Site Engineer', isActive: true });
        (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'dept1', name: 'Engineering', isActive: true });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue({ id: 'newUser' });
        (prisma.inviteToken.upsert as jest.Mock).mockResolvedValue({});

        await service.inviteUser(dto);

        expect(prisma.user.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ email: dto.email, status: 'PENDING' }),
        });
        expect(mail.sendMail).toHaveBeenCalledWith(
            dto.email,
            expect.stringContaining('invited'),
            expect.any(String),
        );
        });
    });

    describe('validateInviteToken', () => {
        it('rejects a token that does not exist', async () => {
        (prisma.inviteToken.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.validateInviteToken('bogus')).rejects.toThrow(BadRequestException);
        });

        it('rejects a token that was already accepted', async () => {
        (prisma.inviteToken.findUnique as jest.Mock).mockResolvedValue({
            acceptedAt: new Date(), expiresAt: new Date(Date.now() + 100000), user: { email: 'x@example.com' },
        });
        await expect(service.validateInviteToken('used')).rejects.toThrow(BadRequestException);
        });

        it('rejects an expired token', async () => {
        (prisma.inviteToken.findUnique as jest.Mock).mockResolvedValue({
            acceptedAt: null, expiresAt: new Date(Date.now() - 1000), user: { email: 'x@example.com' },
        });
        await expect(service.validateInviteToken('expired')).rejects.toThrow(BadRequestException);
        });

        it('returns the invitee email for a valid, unused, unexpired token', async () => {
        (prisma.inviteToken.findUnique as jest.Mock).mockResolvedValue({
            acceptedAt: null, expiresAt: new Date(Date.now() + 100000), user: { email: 'x@example.com' },
        });
        const result = await service.validateInviteToken('valid');
        expect(result).toEqual({ email: 'x@example.com' });
        });
    });

    describe('completeRegistration', () => {
        const dto = { fullName: 'Jane Doe', phone: '+2348000000000', password: 'a-strong-password' };

        it('rejects an invalid/expired token before touching the database', async () => {
        (prisma.inviteToken.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.completeRegistration('bad', dto as never)).rejects.toThrow(BadRequestException);
        expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('hashes the password before storing it — never stores the plaintext', async () => {
        (prisma.inviteToken.findUnique as jest.Mock).mockResolvedValue({
            id: 'inv1', userId: 'user1', acceptedAt: null, expiresAt: new Date(Date.now() + 100000),
        });
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-value');

        await service.completeRegistration('tok', dto as never);

        expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
        expect(prisma.$transaction).toHaveBeenCalled();
        });

        it('translates a duplicate-phone conflict into ConflictException', async () => {
        (prisma.inviteToken.findUnique as jest.Mock).mockResolvedValue({
            id: 'inv1', userId: 'user1', acceptedAt: null, expiresAt: new Date(Date.now() + 100000),
        });
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
        const phoneConflict = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '7.9.1' });
        (prisma.$transaction as jest.Mock).mockRejectedValue(phoneConflict);

        await expect(service.completeRegistration('tok', dto as never)).rejects.toThrow(ConflictException);
        });

        it('rethrows a non-conflict database error unchanged', async () => {
        (prisma.inviteToken.findUnique as jest.Mock).mockResolvedValue({
            id: 'inv1', userId: 'user1', acceptedAt: null, expiresAt: new Date(Date.now() + 100000),
        });
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
        (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('connection lost'));

        await expect(service.completeRegistration('tok', dto as never)).rejects.toThrow('connection lost');
        });
    });

    describe('login — the highest-stakes logic in the file', () => {
        const dto = { email: 'user@example.com', password: 'correct-password' };
        const meta = { ipAddress: '127.0.0.1', userAgent: 'jest' };

        it('rejects a non-existent email with the SAME generic message as a wrong password (no user enumeration)', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.login(dto, meta)).rejects.toThrow(UnauthorizedException);
        await expect(service.login(dto, meta)).rejects.toThrow('Invalid email or password');
        });

        it('logs a failed attempt when the email does not exist', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.login(dto, meta)).rejects.toThrow(UnauthorizedException);

        expect(prisma.loginActivity.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ email: dto.email, success: false, reason: 'invalid_credentials' }),
        });
        });

        it('rejects a user who never completed registration (no passwordHash)', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', passwordHash: null, status: 'PENDING' });
        await expect(service.login(dto, meta)).rejects.toThrow(UnauthorizedException);
        });

        it('rejects an INACTIVE user even with the correct password, before ever checking it', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: '1', passwordHash: 'hash', status: 'INACTIVE', role: null,
        });
        await expect(service.login(dto, meta)).rejects.toThrow(UnauthorizedException);
        expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('logs a failed attempt with reason account_inactive for an inactive user', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: '1', passwordHash: 'hash', status: 'INACTIVE', role: null,
        });
        await expect(service.login(dto, meta)).rejects.toThrow(UnauthorizedException);

        expect(prisma.loginActivity.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ success: false, reason: 'account_inactive' }),
        });
        });

        it('rejects a wrong password with the same generic message', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: '1', passwordHash: 'hash', status: 'ACTIVE', role: null,
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(service.login(dto, meta)).rejects.toThrow('Invalid email or password');
        });

        it('creates a Session and signs a JWT containing sub, role, permissions, and sessionId on success', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user1', passwordHash: 'hash', status: 'ACTIVE',
            fullName: 'Jane', email: dto.email,
            role: { name: 'Site Engineer', permissions: ['content:read', 'content:write'] },
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        (prisma.session.create as jest.Mock).mockResolvedValue({ id: 'session1' });

        const result = await service.login(dto, meta);

        expect(prisma.session.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ userId: 'user1', ipAddress: meta.ipAddress, userAgent: meta.userAgent }),
        });
        expect(jwt.sign).toHaveBeenCalledWith({
            sub: 'user1', role: 'Site Engineer', permissions: ['content:read', 'content:write'], sessionId: 'session1',
        });
        expect(result.accessToken).toBe('signed.jwt.token');
        expect(result.refreshToken).toEqual(expect.any(String));
        });

        it('logs a successful attempt on success', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user1', passwordHash: 'hash', status: 'ACTIVE', fullName: 'Jane', email: dto.email,
            role: { name: 'Site Engineer', permissions: [] },
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.login(dto, meta);

        expect(prisma.loginActivity.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ email: dto.email, userId: 'user1', success: true }),
        });
        });

        it('signs an empty permissions array for a user with no role assigned, rather than throwing', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user1', passwordHash: 'hash', status: 'ACTIVE', fullName: 'Jane', email: dto.email, role: null,
        });
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        await service.login(dto, meta);

        expect(jwt.sign).toHaveBeenCalledWith(
            expect.objectContaining({ role: null, permissions: [] }),
        );
        });
    });

    describe('refreshTokens', () => {
        it('rejects a refresh token that does not match any session', async () => {
        (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.refreshTokens('bogus', {})).rejects.toThrow(UnauthorizedException);
        });

        it('rejects a revoked session', async () => {
        (prisma.session.findUnique as jest.Mock).mockResolvedValue({
            id: 's1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 100000),
            user: { status: 'ACTIVE', role: null },
        });
        await expect(service.refreshTokens('tok', {})).rejects.toThrow(UnauthorizedException);
        });

        it('rejects an expired session', async () => {
        (prisma.session.findUnique as jest.Mock).mockResolvedValue({
            id: 's1', revokedAt: null, expiresAt: new Date(Date.now() - 1000),
            user: { status: 'ACTIVE', role: null },
        });
        await expect(service.refreshTokens('tok', {})).rejects.toThrow(UnauthorizedException);
        });

        it('rejects when the account is no longer ACTIVE', async () => {
        (prisma.session.findUnique as jest.Mock).mockResolvedValue({
            id: 's1', revokedAt: null, expiresAt: new Date(Date.now() + 100000),
            user: { status: 'INACTIVE', role: null },
        });
        await expect(service.refreshTokens('tok', {})).rejects.toThrow(UnauthorizedException);
        });

        it('rotates the refresh token on the same session row rather than creating a new one', async () => {
        (prisma.session.findUnique as jest.Mock).mockResolvedValue({
            id: 's1', revokedAt: null, expiresAt: new Date(Date.now() + 100000),
            user: { id: 'u1', status: 'ACTIVE', role: { name: 'Site Engineer', permissions: [] } },
        });
        (prisma.session.update as jest.Mock).mockResolvedValue({});

        const result = await service.refreshTokens('tok', {});

        expect(prisma.session.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 's1' } }),
        );
        expect(prisma.session.create).not.toHaveBeenCalled();
        expect(result.accessToken).toBe('signed.jwt.token');
        expect(result.refreshToken).toEqual(expect.any(String));
        });
    });

    describe('logout', () => {
        it('revokes the given session', async () => {
        (prisma.session.update as jest.Mock).mockResolvedValue({});
        await service.logout('session1');
        expect(prisma.session.update).toHaveBeenCalledWith({
            where: { id: 'session1' }, data: { revokedAt: expect.any(Date) },
        });
        });
    });

    describe('forgotPassword — must never reveal whether an email exists', () => {
        it('returns the identical generic message whether or not the email exists', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        const resultForMissing = await service.forgotPassword('nobody@example.com');

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', status: 'ACTIVE' });
        (prisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({});
        (prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({});
        const resultForReal = await service.forgotPassword('real@example.com');

        expect(resultForMissing).toEqual(resultForReal);
        });

        it('does not send an email or create a token for a non-existent user', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        await service.forgotPassword('nobody@example.com');
        expect(mail.sendMail).not.toHaveBeenCalled();
        expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
        });

        it('does not send a reset email for an INACTIVE account, even if it exists', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', status: 'INACTIVE' });
        await service.forgotPassword('inactive@example.com');
        expect(mail.sendMail).not.toHaveBeenCalled();
        });

        it('invalidates any previously-issued unused reset tokens before creating a new one', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', status: 'ACTIVE' });
        (prisma.passwordResetToken.updateMany as jest.Mock).mockResolvedValue({});
        (prisma.passwordResetToken.create as jest.Mock).mockResolvedValue({});

        await service.forgotPassword('real@example.com');

        expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
            where: { userId: '1', usedAt: null },
            data: { usedAt: expect.any(Date) },
        });
        });
    });

    describe('resetPassword', () => {
        const dto = { newPassword: 'a-new-strong-password' };

        it('rejects a token that does not exist', async () => {
        (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.resetPassword('bad', dto as never)).rejects.toThrow(BadRequestException);
        });

        it('rejects a token that was already used', async () => {
        (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
            usedAt: new Date(), expiresAt: new Date(Date.now() + 100000),
        });
        await expect(service.resetPassword('used', dto as never)).rejects.toThrow(BadRequestException);
        });

        it('rejects an expired token', async () => {
        (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
            usedAt: null, expiresAt: new Date(Date.now() - 1000),
        });
        await expect(service.resetPassword('expired', dto as never)).rejects.toThrow(BadRequestException);
        });

        it('hashes the new password, marks the token used, AND revokes all existing sessions', async () => {
        (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
            id: 'rt1', userId: 'user1', usedAt: null, expiresAt: new Date(Date.now() + 100000),
        });
        (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
        (prisma.session.updateMany as jest.Mock).mockResolvedValue({});

        await service.resetPassword('valid', dto as never);

        expect(bcrypt.hash).toHaveBeenCalledWith(dto.newPassword, 12);
        expect(prisma.$transaction).toHaveBeenCalled();
        expect(prisma.session.updateMany).toHaveBeenCalledWith({
            where: { userId: 'user1', revokedAt: null },
            data: { revokedAt: expect.any(Date) },
        });
        });
    });

    describe('getMe', () => {
        it('throws NotFoundException for a user ID that does not exist', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.getMe('missing')).rejects.toThrow(NotFoundException);
        });

        it('returns the profile when the user exists', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', fullName: 'Jane' });
        const result = await service.getMe('1');
        expect(result).toEqual({ id: '1', fullName: 'Jane' });
        });
    });
});