// src/modules/media/schemas/media.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export enum MediaType {
  POST = 'post',
  REEL = 'reel',
  STORY = 'story',
}

export enum MediaStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum MediaFileType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Media extends Document {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true, enum: MediaType })
  media_type: MediaType;

  @Prop({ required: true, enum: MediaFileType })
  file_type: MediaFileType;

  @Prop({ required: true, enum: MediaStatus, default: MediaStatus.PENDING })
  status: MediaStatus;

  @Prop()
  caption: string;

  @Prop([String])
  hashtags: string[];

  @Prop({
    type: {
      width: Number,
      height: Number,
      duration: Number,
    },
  })
  dimensions: {
    width: number;
    height: number;
    duration?: number;
  };

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user_id: string;

  @Prop()
  created_at: Date;

  @Prop()
  updated_at: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  approved_by: string;

  @Prop()
  approved_at: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  rejected_by: string;

  @Prop()
  rejected_at: Date;

  @Prop()
  instagram_post_id: string;
}

export const MediaSchema = SchemaFactory.createForClass(Media);
