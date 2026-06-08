import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserCurriculum } from './schemas/user.curriculum.schema';
import { QuizAttempt, QuizAttemptDocument } from './schemas/quizz.attempt.schema';
import { Identifier } from 'src/users/users.service';

export interface QuizBreakdown {
  quizIndex: number;
  question: string;
  totalAttempts: number;
  correctAttempts: number;
  passRate: number;
  firstAttemptCorrect: boolean | null;
  retriedAfterFail: boolean;
  bestAttemptNumber: number | null;
}

export interface LessonProgress {
  lessonNumber: number;
  lessonTitle: string;
  totalQuizzes: number;
  attemptedQuizzes: number;
  participationRate: number;
  overallPassRate: number;
  quizBreakdowns: QuizBreakdown[];
}

export interface ModuleProgress {
  moduleNumber: number;
  moduleTitle: string;
  lessons: LessonProgress[];
  modulePassRate: number;
  moduleParticipationRate: number;
}

export interface UserCurriculumProgress {
  userCurriculumId: string;
  courseTitle: string;
  totalModules: number;
  overallParticipationRate: number;
  overallPassRate: number;
  overallRetryRate: number;
  modules: ModuleProgress[];
}

@Injectable()
export class ProgressService {
  private readonly logger = new Logger(ProgressService.name);

  constructor(
    @InjectModel(UserCurriculum.name)
    private userCurriculumModel: Model<UserCurriculum>,
    @InjectModel(QuizAttempt.name)
    private quizAttemptModel: Model<QuizAttemptDocument>,
  ) {}

  /**
   * Full quiz progress breakdown for one user on one curriculum.
   * Powers the student-facing "My Progress" screen.
   */
  async getUserCurriculumProgress(
    userId: Identifier,
    userCurriculumId: string,
  ): Promise<UserCurriculumProgress> {
    const curriculum = await this.userCurriculumModel.findById(userCurriculumId);
    if (!curriculum) throw new NotFoundException('User curriculum not found');

    // Single query — pull every attempt this user has made on this curriculum
    const allAttempts = await this.quizAttemptModel
      .find({
        userId: new Types.ObjectId(userId),
        userCurriculumId: new Types.ObjectId(userCurriculumId),
      })
      .sort({ createdAt: 1 }) // ascending so index 0 = first attempt
      .lean<QuizAttempt[]>();  // lean<T> tells TS what shape to expect

    // Index by composite key for O(1) lookups inside the nested loops below
    const attemptMap = new Map<string, QuizAttempt[]>();
    for (const attempt of allAttempts) {
      const key = `${attempt.moduleNumber}-${attempt.lessonNumber}-${attempt.quizIndex}`;
      if (!attemptMap.has(key)) attemptMap.set(key, []);
      attemptMap.get(key)!.push(attempt);
    }

    let totalQuizzesInCurriculum = 0;
    let totalQuizzesAttempted = 0;
    let totalAttempts = 0;
    let totalCorrect = 0;
    let totalRetriedQuizzes = 0;

    const moduleProgresses: ModuleProgress[] = [];

    for (const mod of curriculum.modules) {
      const lessonProgresses: LessonProgress[] = [];
      let modTotalQuizzes = 0;
      let modAttempted = 0;
      let modCorrect = 0;
      let modAttemptCount = 0;

      for (const lesson of mod.lessons) {
        const quizBreakdowns: QuizBreakdown[] = [];
        let lessonAttemptCount = 0;
        let lessonCorrect = 0;
        let lessonAttempted = 0;

        const quizCount = lesson.quizzes?.length ?? 0;
        modTotalQuizzes += quizCount;
        totalQuizzesInCurriculum += quizCount;

        for (let qi = 0; qi < quizCount; qi++) {
          const key = `${mod.moduleNumber}-${lesson.lessonNumber}-${qi}`;
          const attempts = attemptMap.get(key) ?? [];
          const quiz = lesson.quizzes[qi];

          const quizAttemptCount = attempts.length;
          const quizCorrectCount = attempts.filter(a => a.isCorrect).length;
          const firstAttempt = attempts[0] ?? null;
          const firstCorrectAttempt = attempts.find(a => a.isCorrect) ?? null;
          const wasRetried = quizAttemptCount > 1;

          if (quizAttemptCount > 0) {
            lessonAttempted++;
            modAttempted++;
            totalQuizzesAttempted++;
            // Retried = attempted more than once AND first attempt was wrong
            if (wasRetried && firstAttempt && !firstAttempt.isCorrect) {
              totalRetriedQuizzes++;
            }
          }

          lessonAttemptCount += quizAttemptCount;
          lessonCorrect += quizCorrectCount;

          quizBreakdowns.push({
            quizIndex: qi,
            question: quiz.question,
            totalAttempts: quizAttemptCount,
            correctAttempts: quizCorrectCount,
            passRate: quizAttemptCount > 0
              ? Math.round((quizCorrectCount / quizAttemptCount) * 100)
              : 0,
            firstAttemptCorrect: firstAttempt !== null ? firstAttempt.isCorrect : null,
            // FIX: explicit boolean cast — no more ambiguous truthiness chain
            retriedAfterFail:
              wasRetried &&
              firstAttempt !== null &&
              firstAttempt.isCorrect === false,
            bestAttemptNumber: firstCorrectAttempt?.attemptNumber ?? null,
          });
        }

        modCorrect += lessonCorrect;
        modAttemptCount += lessonAttemptCount;

        lessonProgresses.push({
          lessonNumber: lesson.lessonNumber,
          lessonTitle: lesson.lessonTitle,
          totalQuizzes: quizCount,
          attemptedQuizzes: lessonAttempted,
          participationRate: quizCount > 0
            ? Math.round((lessonAttempted / quizCount) * 100)
            : 0,
          overallPassRate: lessonAttemptCount > 0
            ? Math.round((lessonCorrect / lessonAttemptCount) * 100)
            : 0,
          quizBreakdowns,
        });
      }

      totalAttempts += modAttemptCount;
      totalCorrect += modCorrect;

      moduleProgresses.push({
        moduleNumber: mod.moduleNumber,
        moduleTitle: mod.moduleTitle,
        lessons: lessonProgresses,
        modulePassRate: modAttemptCount > 0
          ? Math.round((modCorrect / modAttemptCount) * 100)
          : 0,
        moduleParticipationRate: modTotalQuizzes > 0
          ? Math.round((modAttempted / modTotalQuizzes) * 100)
          : 0,
      });
    }

    return {
      userCurriculumId,
      courseTitle: curriculum.courseTitle,
      totalModules: curriculum.totalModules,
      overallParticipationRate: totalQuizzesInCurriculum > 0
        ? Math.round((totalQuizzesAttempted / totalQuizzesInCurriculum) * 100)
        : 0,
      overallPassRate: totalAttempts > 0
        ? Math.round((totalCorrect / totalAttempts) * 100)
        : 0,
      overallRetryRate: totalQuizzesAttempted > 0
        ? Math.round((totalRetriedQuizzes / totalQuizzesAttempted) * 100)
        : 0,
      modules: moduleProgresses,
    };
  }
}