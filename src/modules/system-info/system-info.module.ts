import { Module } from '@nestjs/common';
import { SystemInfoController } from './system-info.controller';
import { SystemInfoService } from './system-info.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SystemInfoController],
  providers: [SystemInfoService],
})
export class SystemInfoModule {}