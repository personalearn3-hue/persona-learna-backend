import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as userGuard from 'src/users/user.guard';
import { CreateCurriculumDto } from './dtos/create.curriculum.dto';
import { GenerateLearningScriptDto } from './dtos/ai.dto';
import { QuizAttemptResult, QuizExplanationResult, QuizService } from './quiz.service';
import { AttemptQuizDto, ExplainQuizDto } from './dtos/quiz.dto';


@Controller('curriculum')
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService, private readonly quizService: QuizService) {}

  @Post('create')
  @UseGuards(userGuard.UserGuard)
  @UseInterceptors(FileInterceptor('file'))
  async createCurriculum(
    @Req() req: userGuard.UserPopulatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateCurriculumDto,
  ) {
    return await this.curriculumService.createCurriculum(
      req.user.id,
      file,
      body,
    );
  };

    @Post(':id/enroll')
  @UseGuards(userGuard.UserGuard)
  async enrollInCurriculum(
    @Req() req: userGuard.UserPopulatedRequest,
    @Param('id') curriculumId: string,
    @Body() dto: GenerateLearningScriptDto,
  ) {
    return await this.curriculumService.generatePersonalizedCurriculum(
      req.user.id,
      curriculumId,
      dto,
    );
  }

  @Post(':userCurriculumId/attempt')
  @UseGuards(userGuard.UserGuard)
  async attemptQuiz(
    @Req() req: userGuard.UserPopulatedRequest,
    @Param('userCurriculumId') userCurriculumId: string,
    @Body() dto: AttemptQuizDto,
  ): Promise<QuizAttemptResult> {
    return this.quizService.attemptQuiz(
      req.user.id,
      userCurriculumId,
      dto.moduleNumber,
      dto.lessonNumber,
      dto.quizIndex,
      dto.selectedOption,
    );
  }
 
  /**
   * POST /quiz/:userCurriculumId/explain
   * Get a GPT-powered explanation scoped strictly to the lesson and question.
   * Call as many times as needed — pass conversationHistory to get progressive breakdowns.
   */
  @Post(':userCurriculumId/explain')
  async explainQuiz(
    @Param('userCurriculumId') userCurriculumId: string,
    @Body() dto: ExplainQuizDto,
  ): Promise<QuizExplanationResult> {
    return this.quizService.explainQuiz(
      userCurriculumId,
      dto.moduleNumber,
      dto.lessonNumber,
      dto.quizIndex,
      dto.selectedOption,
      dto.conversationHistory ?? [],
    );
  }
}
