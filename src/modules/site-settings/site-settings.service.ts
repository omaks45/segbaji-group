import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SINGLETON_ID } from '../../common/constants/singleton.constant';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';

interface SiteSettingsDefaults {
  officeAddress: string | null;
  phonePrimary: string | null;
  phoneSecondary: string | null;
  email: string | null;
  officeHours: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  linkedinUrl: string | null;
  whatsappNumber: string | null;
  missionStatement: string | null;
  visionStatement: string | null;
  companyStory: string | null;
}

const DEFAULTS: SiteSettingsDefaults = {
  officeAddress: null,
  phonePrimary: null,
  phoneSecondary: null,
  email: null,
  officeHours: null,
  facebookUrl: null,
  instagramUrl: null,
  twitterUrl: null,
  linkedinUrl: null,
  whatsappNumber: null,
  missionStatement: null,
  visionStatement: null,
  companyStory: null,
};

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async find() {
    const settings = await this.prisma.siteSettings.findUnique({ where: { id: SINGLETON_ID } });
    return settings ?? DEFAULTS;
  }

  update(dto: UpdateSiteSettingsDto) {
    return this.prisma.siteSettings.upsert({
      where: { id: SINGLETON_ID },
      update: dto,
      create: { id: SINGLETON_ID, ...dto },
    });
  }
}