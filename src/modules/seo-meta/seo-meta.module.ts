import { Module } from '@nestjs/common';
import { SeoMetaController } from './seo-meta.controller';
import { SeoMetaService } from './seo-meta.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SeoMetaController],
  providers: [SeoMetaService],
})
export class SeoMetaModule {}