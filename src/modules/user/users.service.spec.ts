import { UsersService } from './user.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

function buildMockPrisma() {
    return {
        user: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
    } as unknown as PrismaService;
    }

    function buildMockCloudinary() {
    return { uploadBuffer: jest.fn(), deleteAsset: jest.fn() } as unknown as CloudinaryService;
    }

    describe('UsersService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let cloudinary: ReturnType<typeof buildMockCloudinary>;
    let service: UsersService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        cloudinary = buildMockCloudinary();
        service = new UsersService(prisma, cloudinary);
    });

    describe('updateProfile', () => {
        it('updates only bio, scoped to the given user ID', async () => {
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user1', bio: 'New bio' });

        const result = await service.updateProfile('user1', { bio: 'New bio' } as never);

        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 'user1' },
            data: { bio: 'New bio' },
            select: { id: true, bio: true },
        });
        expect(result.bio).toBe('New bio');
        });
    });

    describe('updateProfilePicture', () => {
        it('uploads the new image and deletes the previous one', async () => {
        (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({ profilePicturePublicId: 'old-pic' });
        (cloudinary.uploadBuffer as jest.Mock).mockResolvedValue({ url: 'https://new.jpg', publicId: 'new-pic' });
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user1', profilePictureUrl: 'https://new.jpg' });

        await service.updateProfilePicture('user1', { buffer: Buffer.from('x') } as Express.Multer.File);

        expect(cloudinary.uploadBuffer).toHaveBeenCalledWith(
            expect.any(Buffer),
            { folder: 'segbaji/profile-pictures' },
        );
        expect(cloudinary.deleteAsset).toHaveBeenCalledWith('old-pic');
        });

        it('does not attempt cleanup for a user uploading their first-ever profile picture', async () => {
        (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({ profilePicturePublicId: null });
        (cloudinary.uploadBuffer as jest.Mock).mockResolvedValue({ url: 'https://new.jpg', publicId: 'new-pic' });
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user1' });

        await service.updateProfilePicture('user1', { buffer: Buffer.from('x') } as Express.Multer.File);

        expect(cloudinary.deleteAsset).not.toHaveBeenCalled();
        });

        it('returns only the fields the endpoint contract promises (id, profilePictureUrl)', async () => {
        (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({ profilePicturePublicId: null });
        (cloudinary.uploadBuffer as jest.Mock).mockResolvedValue({ url: 'https://new.jpg', publicId: 'new-pic' });
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user1', profilePictureUrl: 'https://new.jpg' });

        await service.updateProfilePicture('user1', { buffer: Buffer.from('x') } as Express.Multer.File);

        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
            select: { id: true, profilePictureUrl: true },
            }),
        );
        });
    });
});