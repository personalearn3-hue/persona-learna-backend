import { Controller, Get, DefaultValuePipe, ParseIntPipe, Param, Query } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}
 
  /**
   * GET /analytics/platform?days=30
   */
  @Get('platform')
  getPlatformAnalytics(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getPlatformAnalytics(days);
  }
 
  /** GET /analytics/platform/participation */
  @Get('platform/participation')
  getParticipation() {
    return this.analyticsService.getParticipationStats();
  }
 
  /** GET /analytics/platform/pass-fail */
  @Get('platform/pass-fail')
  getPassFail() {
    return this.analyticsService.getPassFailStats();
  }
 
  /** GET /analytics/platform/retries */
  @Get('platform/retries')
  getRetries() {
    return this.analyticsService.getRetryStats();
  }
 
  /** GET /analytics/platform/growth?days=30 */
  @Get('platform/growth')
  getGrowth(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analyticsService.getGrowthData(days);
  }
 
  /** GET /analytics/platform/hardest-quizzes */
  @Get('platform/hardest-quizzes')
  getHardestQuizzes() {
    return this.analyticsService.getHardestQuizzes();
  }
 
  /**
   * GET /analytics/curriculum/:curriculumId
   * Aggregate stats scoped to one curriculum (useful for instructors).
   */
  @Get('curriculum/:curriculumId')
  getCurriculumAnalytics(@Param('curriculumId') curriculumId: string) {
    return this.analyticsService.getCurriculumAnalytics(curriculumId);
  }
}