// src/modules/media/media.service.ts
import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Media, MediaType, MediaStatus, MediaFileType } from './schemas/media.schema';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaStatusDto } from './dto/update-media-status.dto';
import { UploadService } from '../../common/services/upload.service';
import { User } from '../auth/schemas/user.schema';
import sharp from 'sharp';
import { promisify } from 'util';
import * as ffprobe from 'ffprobe';
import * as ffprobeStatic from 'ffprobe-static';

ffprobe.path = ffprobeStatic.path;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectModel(Media.name) private readonly mediaModel: Model<Media>,
    @Inject(forwardRef(() => User)) private readonly userModel: Model<User>,
    private readonly uploadService: UploadService,
  ) { }

  /**
   * Gets video dimensions using ffprobe
   */
  private async getVideoDimensions(buffer: Buffer): Promise<{ width: number; height: number; duration: number }> {
    try {
      // First try: Use ffprobe if available
      try {
        // Import dependencies inside function to avoid global import issues
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        const { promisify } = require('util');
        const ffprobe = require('ffprobe');
        const ffprobeStatic = require('ffprobe-static');

        // Create a temporary file path
        const tempPath = path.join(os.tmpdir(), `temp-${Date.now()}.mp4`);

        // Write buffer to temporary file
        fs.writeFileSync(tempPath, buffer);

        // Get video metadata
        const probeAsync = promisify(ffprobe);
        const info = await probeAsync(tempPath, { path: ffprobeStatic.path });

        // Clean up temporary file
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupError) {
          this.logger.warn(`Failed to clean up temporary file: ${cleanupError.message}`);
          // Continue even if cleanup fails
        }

        // Extract video stream
        const videoStream = info.streams.find(stream => stream.codec_type === 'video');

        if (!videoStream) {
          throw new Error('Invalid video file: no video stream found');
        }

        const width = parseInt(videoStream.width || '0', 10);
        const height = parseInt(videoStream.height || '0', 10);
        const duration = parseFloat(videoStream.duration || '0');

        if (width > 0 && height > 0) {
          return { width, height, duration };
        } else {
          throw new Error('Invalid video dimensions');
        }
      } catch (ffprobeError) {
        // Log the ffprobe error but don't fail yet
        this.logger.warn(`FFprobe failed: ${ffprobeError.message}, trying fallback method`);
        throw ffprobeError; // Pass to fallback
      }
    } catch (error) {
      // Fallback: Use default dimensions based on media type
      this.logger.warn(`Using fallback video dimensions due to error: ${error.message}`);

      // Default to 9:16 aspect ratio (typical for Instagram reels/stories)
      return {
        width: 1080,
        height: 1920,
        duration: 30 // Default duration in seconds
      };
    }
  }


  /**
   * Validates video duration based on Instagram requirements
   */
  private validateVideoDuration(duration: number, mediaType: MediaType): void {
    switch (mediaType) {
      case MediaType.POST:
        // Instagram feed videos: 3 seconds to 60 seconds
        if (duration < 3) {
          throw new BadRequestException('Instagram feed videos must be at least 3 seconds long');
        }
        if (duration > 60) {
          throw new BadRequestException('Instagram feed videos must be no longer than 60 seconds');
        }
        break;
      case MediaType.STORY:
        // Instagram stories: 1 second to 15 seconds
        if (duration < 1) {
          throw new BadRequestException('Instagram story videos must be at least 1 second long');
        }
        if (duration > 15) {
          throw new BadRequestException('Instagram story videos must be no longer than 15 seconds');
        }
        break;
      case MediaType.REEL:
        // Instagram reels: 3 seconds to 90 seconds
        if (duration < 3) {
          throw new BadRequestException('Instagram reels must be at least 3 seconds long');
        }
        if (duration > 90) {
          throw new BadRequestException('Instagram reels must be no longer than 90 seconds');
        }
        break;
    }
  }

  /**
   * Validates dimensions for Instagram media types
   */
  private async validateDimensions(
    file: Express.Multer.File,
    mediaType: MediaType,
    fileType: MediaFileType,
  ): Promise<{ width: number; height: number; duration?: number }> {
    try {
      if (fileType === MediaFileType.IMAGE) {
        try {
          // Import sharp dynamically to handle potential import issues
          const sharpModule = require('sharp');

          // Try using sharp
          const metadata = await sharpModule(file.buffer).metadata();
          const width: number = metadata.width!;
          const height: number = metadata.height!;

          // Validate dimensions based on Instagram requirements
          switch (mediaType) {
            case MediaType.POST:
              // Square post (1:1)
              if (width !== height) {
                throw new BadRequestException('Instagram posts should have a 1:1 aspect ratio (square)');
              }
              if (width !== 1080 || height !== 1080) {
                this.logger.warn(`Non-optimal dimensions for Instagram post: ${width}x${height}, recommended: 1080x1080`);
              }
              break;
            case MediaType.STORY:
              // Stories (9:16)
              const storyRatio = width / height;
              if (Math.abs(storyRatio - 9 / 16) > 0.05) {
                throw new BadRequestException('Instagram stories should have a 9:16 aspect ratio');
              }
              if (width !== 1080 || height !== 1920) {
                this.logger.warn(`Non-optimal dimensions for Instagram story: ${width}x${height}, recommended: 1080x1920`);
              }
              break;
            case MediaType.REEL:
              // Reels (9:16)
              const reelRatio = width / height;
              if (Math.abs(reelRatio - 9 / 16) > 0.05) {
                throw new BadRequestException('Instagram reels should have a 9:16 aspect ratio');
              }
              if (width !== 1080 || height !== 1920) {
                this.logger.warn(`Non-optimal dimensions for Instagram reel: ${width}x${height}, recommended: 1080x1920`);
              }
              break;
          }

          return { width, height };
        } catch (sharpError) {
          // Log the sharp-specific error
          this.logger.warn(`Sharp error: ${sharpError.message}, using fallback image dimensions`);

          // Fallback: Use default dimensions based on media type or try to extract dimensions another way
          let width = 1080;
          let height = 1080;

          if (mediaType === MediaType.STORY || mediaType === MediaType.REEL) {
            width = 1080;
            height = 1920;
          }

          // Log that we're using fallback dimensions
          this.logger.log(`Using fallback dimensions for ${mediaType}: ${width}x${height}`);

          return { width, height };
        }
      } else if (fileType === MediaFileType.VIDEO) {
        // Get video dimensions and duration
        const { width, height, duration } = await this.getVideoDimensions(file.buffer);

        // Validate video duration
        this.validateVideoDuration(duration, mediaType);

        // Validate dimensions based on Instagram requirements
        switch (mediaType) {
          case MediaType.POST:
            // Square post (1:1) or landscape (1.91:1) or portrait (4:5)
            const postRatio = width / height;

            // Check if it's square (1:1)
            if (Math.abs(postRatio - 1) <= 0.05) {
              if (width < 600 || height < 600) {
                this.logger.warn(`Low resolution for Instagram post: ${width}x${height}, minimum recommended: 600x600`);
              }
            }
            // Check if it's landscape (1.91:1)
            else if (Math.abs(postRatio - 1.91) <= 0.05) {
              if (width < 600 || height < 315) {
                this.logger.warn(`Low resolution for Instagram landscape post: ${width}x${height}, minimum recommended: 600x315`);
              }
            }
            // Check if it's portrait (4:5)
            else if (Math.abs(postRatio - 0.8) <= 0.05) {
              if (width < 600 || height < 750) {
                this.logger.warn(`Low resolution for Instagram portrait post: ${width}x${height}, minimum recommended: 600x750`);
              }
            } else {
              throw new BadRequestException('Instagram video posts should have a 1:1, 1.91:1, or 4:5 aspect ratio');
            }
            break;

          case MediaType.STORY:
          case MediaType.REEL:
            // Stories and Reels (9:16)
            const verticalRatio = width / height;
            if (Math.abs(verticalRatio - 9 / 16) > 0.05) {
              throw new BadRequestException(`Instagram ${mediaType === MediaType.STORY ? 'stories' : 'reels'} should have a 9:16 aspect ratio`);
            }
            if (width < 600 || height < 1067) {
              this.logger.warn(`Low resolution for Instagram ${mediaType === MediaType.STORY ? 'story' : 'reel'}: ${width}x${height}, minimum recommended: 600x1067`);
            }
            break;
        }

        return { width, height, duration };
      }

      throw new BadRequestException('Unsupported file type');
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Error validating dimensions: ${error.message}`);
      throw new BadRequestException('Failed to validate media dimensions');
    }
  }


  /**
   * Creates a new media entry
   */
  async create(
    file: Express.Multer.File,
    createMediaDto: CreateMediaDto,
    userId: string,
  ): Promise<Media> {
    try {
      // Validate user exists
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate file type
      if (createMediaDto.file_type === MediaFileType.IMAGE && !file.mimetype.startsWith('image/')) {
        throw new BadRequestException('File type must be an image');
      }

      if (createMediaDto.file_type === MediaFileType.VIDEO && !file.mimetype.startsWith('video/')) {
        throw new BadRequestException('File type must be a video');
      }

      // Validate dimensions
      const dimensions = await this.validateDimensions(
        file,
        createMediaDto.media_type,
        createMediaDto.file_type,
      );

      // Upload file using the new Instagram-specific method
      const mediaUrl = await this.uploadService.saveInstagramMedia(
        file,
        userId,
        createMediaDto.media_type,
        createMediaDto.file_type
      );

      // Extract hashtags from caption if not provided separately
      let hashtags = createMediaDto.hashtags || [];
      if (createMediaDto.caption && !hashtags.length) {
        const hashtagRegex = /#[a-zA-Z0-9_]+/g;
        const matches = createMediaDto.caption.match(hashtagRegex);
        if (matches) {
          hashtags = matches;
        }
      }

      // Create media record
      const newMedia = new this.mediaModel({
        url: mediaUrl,
        media_type: createMediaDto.media_type,
        file_type: createMediaDto.file_type,
        status: MediaStatus.PENDING,
        caption: createMediaDto.caption,
        hashtags,
        dimensions: {
          width: dimensions.width,
          height: dimensions.height,
          duration: dimensions.duration
        },
        user_id: userId,
      });

      return await newMedia.save();
    } catch (error) {
      this.logger.error(`Error creating media: ${error.message}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create media: ${error.message}`);
    }
  }

  /**
   * Gets all media entries with optional filtering
   */
  async findAll(
    userId?: string,
    status?: MediaStatus,
    mediaType?: MediaType,
    isAdmin = false,
  ): Promise<Media[]> {
    try {
      const query: any = {};

      // If not admin, only show user's own media
      if (!isAdmin && userId) {
        query.user_id = userId;
      }

      // Filter by status if provided
      if (status) {
        query.status = status;
      }

      // Filter by media type if provided
      if (mediaType) {
        query.media_type = mediaType;
      }

      return this.mediaModel
        .find(query)
        .sort({ created_at: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding media: ${error.message}`);
      throw new BadRequestException(`Failed to retrieve media: ${error.message}`);
    }
  }

  /**
   * Gets a single media entry by ID
   */
  async findOne(id: string, userId?: string, isAdmin = false): Promise<Media> {
    try {
      const query: any = { _id: id };

      // If not admin, only show user's own media
      if (!isAdmin && userId) {
        query.user_id = userId;
      }

      const media = await this.mediaModel.findOne(query).exec();

      if (!media) {
        throw new NotFoundException('Media not found');
      }

      return media;
    } catch (error) {
      this.logger.error(`Error finding media: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retrieve media: ${error.message}`);
    }
  }

  /**
   * Updates media status (for admins)
   */
  async updateStatus(
    id: string,
    updateMediaStatusDto: UpdateMediaStatusDto,
    adminId: string,
  ): Promise<Media> {
    try {
      const media = await this.mediaModel.findById(id);

      if (!media) {
        throw new NotFoundException('Media not found');
      }

      // Update status and related fields
      media.status = updateMediaStatusDto.status;

      if (updateMediaStatusDto.status === MediaStatus.APPROVED) {
        media.approved_by = adminId;
        media.approved_at = new Date();
      } else if (updateMediaStatusDto.status === MediaStatus.REJECTED) {
        media.rejected_by = adminId;
        media.rejected_at = new Date();
      }

      return await media.save();
    } catch (error) {
      this.logger.error(`Error updating media status: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update media status: ${error.message}`);
    }
  }

  /**
   * Deletes a media entry
   */
  async remove(id: string, userId: string, isAdmin = false): Promise<{ deleted: boolean }> {
    try {
      const query: any = { _id: id };

      // If not admin, only allow deletion of user's own media
      if (!isAdmin) {
        query.user_id = userId;
      }

      const media = await this.mediaModel.findOne(query);

      if (!media) {
        throw new NotFoundException('Media not found');
      }

      // Delete the file from storage using the Instagram-specific delete method
      await this.uploadService.deleteInstagramMedia(media.url);

      // Delete the database record
      await this.mediaModel.deleteOne({ _id: id });

      return { deleted: true };
    } catch (error) {
      this.logger.error(`Error deleting media: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete media: ${error.message}`);
    }
  }

}
