import { Injectable } from '@nestjs/common';
import { CreateSiteStatDto } from './dto/site-stats-response.dto';
import { UpdateSiteStatDto } from './dto/update-site-stat.dto';

@Injectable()
export class SiteStatsService {
  create(createSiteStatDto: CreateSiteStatDto) {
    return 'This action adds a new siteStat';
  }

  findAll() {
    return `This action returns all siteStats`;
  }

  findOne(id: number) {
    return `This action returns a #${id} siteStat`;
  }

  update(id: number, updateSiteStatDto: UpdateSiteStatDto) {
    return `This action updates a #${id} siteStat`;
  }

  remove(id: number) {
    return `This action removes a #${id} siteStat`;
  }
}
