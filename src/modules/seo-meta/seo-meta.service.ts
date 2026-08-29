import { Injectable, NotFoundException } from '@nestjs/common';
import { PageKey } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpsertSeoMetaDto } from './dto/upsert-seo-meta.dto';

@Injectable()
export class SeoMetaService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.seoMeta.findMany({ orderBy: { pageKey: 'asc' } });
  }

  async findOne(pageKey: PageKey) {
    const meta = await this.prisma.seoMeta.findUnique({ where: { pageKey } });
    if (!meta) throw new NotFoundException(`No SEO metadata configured yet for ${pageKey}`);
    return meta;
  }

  upsert(pageKey: PageKey, dto: UpsertSeoMetaDto) {
    return this.prisma.seoMeta.upsert({
      where: { pageKey },
      update: dto,
      create: { pageKey, ...dto },
    });
  }
}