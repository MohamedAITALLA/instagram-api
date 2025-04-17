// src/modules/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from './schemas/user.schema';
import { UserProfile, UserProfileSchema } from '../user-profile/schemas/user-profile.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminGuard } from './guards/admin.guard';
import { EmailModule } from '../email/email.module';
import { UserProfileModule } from '../user-profile/user-profile.module';
import { Model } from 'mongoose';
import { MediaModule } from '../media/media.module';
import { Media } from '../media/schemas/media.schema';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => UserProfileModule),
    forwardRef(() => MediaModule),
    EmailModule,
  ],
  controllers: [AuthController, AdminController],
  providers: [
    AuthService, 
    AdminService, 
    JwtStrategy, 
    AdminGuard,
    {
      provide: User,
      useFactory: (userModel: Model<User>) => userModel,
      inject: [getModelToken(User.name)],
    },
    {
      provide: Media,
      useFactory: (mediaModel: Model<Media>) => mediaModel,
      inject: [getModelToken(Media.name)],
    },
  ],
  exports: [
    AuthService, 
    AdminService, 
    JwtStrategy, 
    AdminGuard,
    User,
    Media,
  ],
})
export class AuthModule {}
