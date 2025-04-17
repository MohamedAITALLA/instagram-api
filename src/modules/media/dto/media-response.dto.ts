// src/modules/media/dto/media-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { MediaType, MediaStatus, MediaFileType } from '../schemas/media.schema';

export class MediaResponseDto {
  @ApiProperty({
    description: 'Media ID',
    example: '60d21b4667d0d8992e610c85'
  })
  id: string;

  @ApiProperty({
    description: 'URL of the media',
    example: 'https://example.com/media/image.jpg'
  })
  url: string;

  @ApiProperty({
    description: 'Type of Instagram media',
    enum: MediaType,
    example: MediaType.POST
  })
  media_type: MediaType;

  @ApiProperty({
    description: 'Type of file (image or video)',
    enum: MediaFileType,
    example: MediaFileType.IMAGE
  })
  file_type: MediaFileType;

  @ApiProperty({
    description: 'Status of the media',
    enum: MediaStatus,
    example: MediaStatus.PENDING
  })
  status: MediaStatus;

  @ApiProperty({
    description: 'Caption for the Instagram media',
    example: 'Beautiful sunset at the beach'
  })
  caption: string;

  @ApiProperty({
    description: 'Hashtags for the Instagram media',
    example: ['#sunset', '#beach', '#vacation']
  })
  hashtags: string[];

  @ApiProperty({
    description: 'Dimensions of the media',
    example: { width: 1080, height: 1080 }
  })
  dimensions: {
    width: number;
    height: number;
  };

  @ApiProperty({
    description: 'User ID who uploaded the media',
    example: '60d21b4667d0d8992e610c85'
  })
  user_id: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-04-17T09:34:00.000Z'
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-04-17T09:34:00.000Z'
  })
  updated_at: Date;
}
