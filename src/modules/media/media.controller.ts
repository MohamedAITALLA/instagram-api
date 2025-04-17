// src/modules/media/media.controller.ts
import { 
    Controller, 
    Get, 
    Post, 
    Body, 
    Patch, 
    Param, 
    Delete, 
    UseInterceptors, 
    UploadedFile, 
    Query, 
    UseGuards, 
    Req,
    BadRequestException
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiConsumes,
    ApiBody,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
    ApiResponse,
  } from '@nestjs/swagger';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { memoryStorage } from 'multer';
  import { MediaService } from './media.service';
  import { CreateMediaDto } from './dto/create-media.dto';
  import { UpdateMediaStatusDto } from './dto/update-media-status.dto';
  import { MediaResponseDto } from './dto/media-response.dto';
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { AdminGuard } from '../auth/guards/admin.guard';
  import { MediaStatus, MediaType, MediaFileType } from './schemas/media.schema';
  
  @ApiTags('Media')
  @Controller('media')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  export class MediaController {
    constructor(private readonly mediaService: MediaService) {}
  
    @Post()
    @UseInterceptors(FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        const fileType = req.body.file_type;
        
        if (fileType === 'image' && !file.mimetype.startsWith('image/')) {
          return callback(new BadRequestException('File must be an image for image media type'), false);
        }
        
        if (fileType === 'video' && !file.mimetype.startsWith('video/')) {
          return callback(new BadRequestException('File must be a video for video media type'), false);
        }
        
        callback(null, true);
      },
      limits: {
        fileSize: 1024 * 1024 * 50, // 50MB (larger limit for video files)
      },
    }))
    @ApiOperation({ summary: 'Upload new Instagram media' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Media file to upload (image or video)',
          },
          media_type: {
            type: 'string',
            enum: Object.values(MediaType),
            description: 'Type of Instagram media',
          },
          file_type: {
            type: 'string',
            enum: Object.values(MediaFileType),
            description: 'Type of file',
          },
          caption: {
            type: 'string',
            description: 'Caption for the Instagram media',
          },
          hashtags: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Hashtags for the Instagram media',
          },
        },
        required: ['file', 'media_type', 'file_type'],
      },
    })
    @ApiResponse({
      status: 201,
      description: 'Media uploaded successfully',
      type: MediaResponseDto,
    })
    async create(
      @Req() req: any,
      @UploadedFile() file: Express.Multer.File,
      @Body() createMediaDto: CreateMediaDto,
    ) {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }
      
      const userId = req.user.userId;
      return this.mediaService.create(file, createMediaDto, userId);
    }
  
    @Get()
    @ApiOperation({ summary: 'Get all media' })
    @ApiQuery({
      name: 'status',
      required: false,
      enum: MediaStatus,
      description: 'Filter by media status',
    })
    @ApiQuery({
      name: 'media_type',
      required: false,
      enum: MediaType,
      description: 'Filter by media type',
    })
    @ApiResponse({
      status: 200,
      description: 'List of media entries',
      type: [MediaResponseDto],
    })
    async findAll(
      @Req() req: any,
      @Query('status') status?: MediaStatus,
      @Query('media_type') mediaType?: MediaType,
    ) {
      const userId = req.user.userId;
      const isAdmin = req.user.isAdmin;
      return this.mediaService.findAll(
        userId,
        status,
        mediaType,
        isAdmin,
      );
    }
  
    @Get(':id')
    @ApiOperation({ summary: 'Get media by ID' })
    @ApiParam({
      name: 'id',
      description: 'Media ID',
    })
    @ApiResponse({
      status: 200,
      description: 'Media details',
      type: MediaResponseDto,
    })
    async findOne(@Req() req: any, @Param('id') id: string) {
      const userId = req.user.userId;
      const isAdmin = req.user.isAdmin;
      return this.mediaService.findOne(id, userId, isAdmin);
    }
  
    @Patch(':id/status')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: 'Update media status (admin only)' })
    @ApiParam({
      name: 'id',
      description: 'Media ID',
    })
    @ApiBody({ type: UpdateMediaStatusDto })
    @ApiResponse({
      status: 200,
      description: 'Media status updated',
      type: MediaResponseDto,
    })
    async updateStatus(
      @Req() req: any,
      @Param('id') id: string,
      @Body() updateMediaStatusDto: UpdateMediaStatusDto,
    ) {
      const adminId = req.user.userId;
      return this.mediaService.updateStatus(
        id,
        updateMediaStatusDto,
        adminId,
      );
    }
  
    @Delete(':id')
    @ApiOperation({ summary: 'Delete media' })
    @ApiParam({
      name: 'id',
      description: 'Media ID',
    })
    @ApiResponse({
      status: 200,
      description: 'Media deleted',
      schema: {
        type: 'object',
        properties: {
          deleted: {
            type: 'boolean',
            example: true,
          },
        },
      },
    })
    async remove(@Req() req: any, @Param('id') id: string) {
      const userId = req.user.userId;
      const isAdmin = req.user.isAdmin;
      return this.mediaService.remove(id, userId, isAdmin);
    }
  }
  