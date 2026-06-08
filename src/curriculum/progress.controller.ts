import { Controller, Get, UseGuards, Req, Param } from "@nestjs/common";
import { ProgressService } from "./progress.service";
import * as userGuard from 'src/users/user.guard';


@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get(':userCurriculumId')
  @UseGuards(userGuard.UserGuard)
  getUserProgress(
    @Req() req: userGuard.UserPopulatedRequest,
    @Param('userCurriculumId') userCurriculumId: string,
  ) {
    return this.progressService.getUserCurriculumProgress(req.user.id, userCurriculumId);
  }
}