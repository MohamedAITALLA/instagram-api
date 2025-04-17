import { forwardRef, Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { Media, MediaSchema } from './schemas/media.schema';
import { User } from '../auth/schemas/user.schema';
import {Model} from 'mongoose';
import { AuthModule } from '../auth/auth.module';
import { UploadService } from 'src/common/services/upload.service';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]),
    forwardRef(() => AuthModule),
  ],
  controllers: [MediaController],
  providers: [MediaService, UploadService],
  exports: [MongooseModule.forFeature([{ name: Media.name, schema: MediaSchema }]), MediaService, UploadService]
})
export class MediaModule {}
