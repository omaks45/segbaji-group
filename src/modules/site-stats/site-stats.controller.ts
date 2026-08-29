import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SiteStatsService } from './site-stats.service';
import { CreateSiteStatDto } from './dto/site-stats-response.dto';
import { UpdateSiteStatDto } from './dto/update-site-stat.dto';

@Controller('site-stats')
export class SiteStatsController {
  constructor(private readonly siteStatsService: SiteStatsService) {}

  @Post()
  create(@Body() createSiteStatDto: CreateSiteStatDto) {
    return this.siteStatsService.create(createSiteStatDto);
  }

  @Get()
  findAll() {
    return this.siteStatsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.siteStatsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSiteStatDto: UpdateSiteStatDto) {
    return this.siteStatsService.update(+id, updateSiteStatDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.siteStatsService.remove(+id);
  }
}
