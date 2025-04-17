// src/modules/media/dto/create-media.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { MediaType, MediaFileType } from '../schemas/media.schema';

export class CreateMediaDto {
  @ApiProperty({
    description: 'Type of Instagram media',
    enum: MediaType,
    example: MediaType.POST
  })
  @IsEnum(MediaType)
  @IsNotEmpty()
  media_type: MediaType;

  @ApiProperty({
    description: 'Type of file (image or video)',
    enum: MediaFileType,
    example: MediaFileType.IMAGE
  })
  @IsEnum(MediaFileType)
  @IsNotEmpty()
  file_type: MediaFileType;

  @ApiProperty({
    description: 'Caption for the Instagram media',
    example: 'Beautiful sunset at the beach',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(2200)
  caption?: string;

  @ApiProperty({
    description: 'Hashtags for the Instagram media',
    example: ['#sunset', '#beach', '#vacation'],
    required: false,
    type: [String]
  })
  @IsOptional()
  hashtags?: string[];
}
