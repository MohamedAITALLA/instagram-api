// src/modules/media/dto/update-media-status.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { MediaStatus } from '../schemas/media.schema';

export class UpdateMediaStatusDto {
  @ApiProperty({
    description: 'Status of the media',
    enum: MediaStatus,
    example: MediaStatus.APPROVED
  })
  @IsEnum(MediaStatus)
  @IsNotEmpty()
  status: MediaStatus;
}
