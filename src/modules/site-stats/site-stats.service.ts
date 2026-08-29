import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SINGLETON_ID } from '../../common/constants/singleton.constant';
import { UpdateSiteStatsDto } from './dto/update-site-stat.dto';

const DEFAULTS = {
  yearsOfExperience: 0,
  yearsOfExperienceSuffix: '+',
  projectsCompleted: 0,
  projectsCompletedSuffix: '+',
  clientSatisfactionRating: 0,
  clientSatisfactionSuffix: '/5',
  skilledProfessionals: 0,
  skilledProfessionalsSuffix: '+',
};

@Injectable()
export class SiteStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Read-only, side-effect-free — returns defaults if nothing's been
   * set yet, rather than writing a row on a GET. */
  async find() {
    const stats = await this.prisma.siteStat.findUnique({ where: { id: SINGLETON_ID } });
    return stats ?? DEFAULTS;
  }

  update(dto: UpdateSiteStatsDto) {
    return this.prisma.siteStat.upsert({
      where: { id: SINGLETON_ID },
      update: dto,
      create: { id: SINGLETON_ID, ...DEFAULTS, ...dto },
    });
  }
}