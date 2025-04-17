// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { AuthModule } from './modules/auth/auth.module';
import { StaticModule } from './common/modules/static.module';
import { AuditModule } from './modules/audit/audit.module';
import { EmailModule } from './modules/email/email.module';
import { MediaModule } from './modules/media/media.module';
@Module({
  imports: [
    UserProfileModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/property-management',
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    StaticModule,
    EmailModule,
    AuditModule,
    MediaModule
  ],
})
export class AppModule {}
