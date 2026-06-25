import { BadRequestException, Body, Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { HeyGenService } from "./heygen.service";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("heygen")
export class HeygenController {
    constructor(private readonly heygenService: HeyGenService) { }

    @Get("/avatars")
  async getAvatars(@Query('ownership') ownership?: 'public' | 'private') {
  return await this.heygenService.getAvailableAvatars(ownership);
}

    @Post('/create')
    @UseInterceptors(FileInterceptor('image'))
    async createPhotoAvatar(
        @UploadedFile() file: Express.Multer.File,
        @Body('name') name: string,
    ) {
        if (!file) {
            throw new BadRequestException('Image file is required');
        }

        if (!name) {
            throw new BadRequestException('Avatar name is required');
        }

        return this.heygenService.uploadPhotoAvatar(name, file);
    }


    @Post('avatar/create-and-train')
    @UseInterceptors(FileInterceptor('file'))
    async createAndTrainAvatar(
        @UploadedFile() file: Express.Multer.File,
        @Body('name') name: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        if (!name) {
            throw new BadRequestException('Avatar name is required');
        }

        return await this.heygenService.createAndTrainAvatar(
            file.buffer,
            file.mimetype,
            name,
        );
    }

    @Post("video/:userCurriculumId")
    async createVideo(
        @Param('userCurriculumId') userCurriculumId: string,
        @Body('avatar_id') avatar_id: string,
        @Body('voice_id') voice_id: string,
    ) {
        return await this.heygenService.generateVideosForCurriculum(userCurriculumId, avatar_id, voice_id)
    }
}