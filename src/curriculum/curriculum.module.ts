import { Module } from '@nestjs/common';
import { CurriculumService } from './curriculum.service';
import { CurriculumController } from './curriculum.controller';
import { UsersModule } from 'src/users/users.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { Mongoose } from 'mongoose';
import { MongooseModule } from '@nestjs/mongoose';
import { Curriculum, CurriculumSchema } from './schemas/curriculum.schema';
import { PdfService } from './pdf.service';
import { AIAgentService } from './ai.agents.service';
import { UserCurriculum, UserCurriculumSchema } from './schemas/user.curriculum.schema';
import { QuizService } from './quiz.service';
import { QuizAttemptSchema } from './schemas/quizz.attempt.schema';
import { AnalyticsService } from './analytics.service';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { AnalyticsController } from './analytics.controller';
import { HeyGenService } from './heygen.service';
import { HeygenController } from './heygen.controller';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: 'Curriculum',
        useFactory: () => {
          const schema = CurriculumSchema;
          return schema;
        }
      },
      {
        name: 'UserCurriculum',
        useFactory: () => {
          const schema = UserCurriculumSchema;
          return schema;
        }
      },
      {
        name: 'QuizAttempt',
        useFactory: () => {
          const schema = QuizAttemptSchema
          return schema
        }
      }
    ]),
    UsersModule,
    CloudinaryModule,
  ],
  exports: [CurriculumService],
  controllers: [CurriculumController, ProgressController, AnalyticsController, HeygenController],
  providers: [CurriculumService, PdfService, AIAgentService, QuizService, AnalyticsService, ProgressService, HeyGenService],
})
export class CurriculumModule { }
