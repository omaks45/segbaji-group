import { Module } from '@nestjs/common';
import { CoreValuesController } from './core-values.controller';
import { CoreValuesService } from './core-values.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CoreValuesController],
  providers: [CoreValuesService],
})
export class CoreValuesModule {}