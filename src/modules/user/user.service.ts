import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CloudinaryService, CloudinaryUploadResult } from '../../common/cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, bio: true },
    });
  }

  async updateProfilePicture(userId: string, file: Express.Multer.File) {
    const existing = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { profilePicturePublicId: true },
    });

    const result: CloudinaryUploadResult = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: 'segbaji/profile-pictures',
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profilePictureUrl: result.url,
        profilePicturePublicId: result.publicId,
      },
      select: { id: true, profilePictureUrl: true },
    });

    // Old asset cleanup runs after the update that determines the
    // response, and doesn't block it — a slow/failed delete shouldn't
    // make the user wait or think their upload failed.
    if (existing.profilePicturePublicId) {
      void this.cloudinary.deleteAsset(existing.profilePicturePublicId);
    }

    return updated;
  }
}