import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') as StringValue },
      }),
    }),
  ],
  controllers: [AuthController, SecurityController],
  providers: [AuthService, SecurityService, JwtAuthGuard, PermissionsGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule, PermissionsGuard],
})
export class AuthModule {}