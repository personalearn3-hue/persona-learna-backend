import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserCurriculum } from './schemas/user.curriculum.schema';
import { QuizAttempt, QuizAttemptDocument } from './schemas/quizz.attempt.schema';

export interface ParticipationStats {
  totalUniqueUsers: number;
  activeUsers: number;
  totalAttempts: number;
  averageAttemptsPerUser: number;
}

export interface PassFailStats {
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  overallPassRate: number;
  firstAttemptPassRate: number;
}

export interface RetryStats {
  totalAttemptedInstances: number;
  totalRetriedInstances: number;
  retryRate: number;
  avgAttemptsToPass: number;
}

export interface GrowthDataPoint {
  date: string; 
  newAttempts: number;
  cumulativeAttempts: number;
  dailyPassRate: number;
}

export interface HardestQuiz {
  question: string;
  moduleTitle: string;
  lessonTitle: string;
  totalAttempts: number;
  passRate: number;
}

export interface CurriculumAnalytics {
  uniqueUsers: number;
  totalAttempts: number;
  passRate: number;
}

export interface PlatformAnalytics {
  participation: ParticipationStats;
  passFailStats: PassFailStats;
  retryStats: RetryStats;
  growth: GrowthDataPoint[];
  hardestQuizzes: HardestQuiz[];
}

// ──────────────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(QuizAttempt.name)
    private quizAttemptModel: Model<QuizAttemptDocument>,
    @InjectModel(UserCurriculum.name)
    private userCurriculumModel: Model<UserCurriculum>,
  ) {}

  // ── Platform-wide dashboard

  async getPlatformAnalytics(days = 30): Promise<PlatformAnalytics> {
    const [participation, passFailStats, retryStats, growth, hardestQuizzes] =
      await Promise.all([
        this.getParticipationStats(),
        this.getPassFailStats(),
        this.getRetryStats(),
        this.getGrowthData(days),
        this.getHardestQuizzes(),
      ]);

    return { participation, passFailStats, retryStats, growth, hardestQuizzes };
  }

  // ── Participation

  async getParticipationStats(): Promise<ParticipationStats> {
    const [attemptResult, totalEnrolled] = await Promise.all([
      this.quizAttemptModel.aggregate<{ totalAttempts: number; activeUsers: number }>([
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            _id: 0,
            totalAttempts: 1,
            activeUsers: { $size: '$uniqueUsers' },
          },
        },
      ]),
      this.userCurriculumModel.countDocuments(),
    ]);

    const data = attemptResult[0] ?? { totalAttempts: 0, activeUsers: 0 };

    return {
      totalUniqueUsers: totalEnrolled,
      activeUsers: data.activeUsers,
      totalAttempts: data.totalAttempts,
      averageAttemptsPerUser:
        data.activeUsers > 0
          ? Math.round((data.totalAttempts / data.activeUsers) * 10) / 10
          : 0,
    };
  }

  // ── Pass / Fail
  async getPassFailStats(): Promise<PassFailStats> {
    const [overall, firstAttemptResult] = await Promise.all([
      this.quizAttemptModel.aggregate<{ total: number; correct: number }>([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          },
        },
      ]),
      this.quizAttemptModel.aggregate<{ total: number; correct: number }>([
        { $match: { attemptNumber: 1 } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          },
        },
      ]),
    ]);

    const o = overall[0] ?? { total: 0, correct: 0 };
    const f = firstAttemptResult[0] ?? { total: 0, correct: 0 };

    return {
      totalAttempts: o.total,
      correctAttempts: o.correct,
      incorrectAttempts: o.total - o.correct,
      overallPassRate: o.total > 0 ? Math.round((o.correct / o.total) * 100) : 0,
      firstAttemptPassRate: f.total > 0 ? Math.round((f.correct / f.total) * 100) : 0,
    };
  }

  // ── Retry stats
  async getRetryStats(): Promise<RetryStats> {
    interface RetryAgg {
      totalInstances: number;
      retriedInstances: number;
      sumAttemptsToPass: number;
      passedInstances: number;
    }

    const result = await this.quizAttemptModel.aggregate<RetryAgg>([
      {
        $group: {
          _id: {
            userId: '$userId',
            userCurriculumId: '$userCurriculumId',
            moduleNumber: '$moduleNumber',
            lessonNumber: '$lessonNumber',
            quizIndex: '$quizIndex',
          },
          totalAttempts: { $sum: 1 },
          everCorrect: { $max: { $cond: ['$isCorrect', 1, 0] } },
          firstCorrectAttempt: {
            $min: { $cond: ['$isCorrect', '$attemptNumber', null] },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalInstances: { $sum: 1 },
          retriedInstances: {
            $sum: { $cond: [{ $gt: ['$totalAttempts', 1] }, 1, 0] },
          },
          sumAttemptsToPass: {
            $sum: {
              $cond: [{ $eq: ['$everCorrect', 1] }, '$firstCorrectAttempt', 0],
            },
          },
          passedInstances: { $sum: '$everCorrect' },
        },
      },
    ]);

    const d = result[0] ?? {
      totalInstances: 0,
      retriedInstances: 0,
      sumAttemptsToPass: 0,
      passedInstances: 0,
    };

    return {
      totalAttemptedInstances: d.totalInstances,
      totalRetriedInstances: d.retriedInstances,
      retryRate:
        d.totalInstances > 0
          ? Math.round((d.retriedInstances / d.totalInstances) * 100)
          : 0,
      avgAttemptsToPass:
        d.passedInstances > 0
          ? Math.round((d.sumAttemptsToPass / d.passedInstances) * 10) / 10
          : 0,
    };
  }

  // ── Growth over time

  async getGrowthData(days = 30): Promise<GrowthDataPoint[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    interface DayRow { _id: string; attempts: number; correct: number }

    const result = await this.quizAttemptModel.aggregate<DayRow>([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          attempts: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dataByDate = new Map(result.map(r => [r._id, r]));
    const points: GrowthDataPoint[] = [];
    let cumulative = 0;

    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const row = dataByDate.get(dateStr);
      const attempts = row?.attempts ?? 0;
      const correct = row?.correct ?? 0;

      cumulative += attempts;

      points.push({
        date: dateStr,
        newAttempts: attempts,
        cumulativeAttempts: cumulative,
        dailyPassRate: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
      });
    }

    return points;
  }

  // ── Hardest quizzes

  async getHardestQuizzes(minAttempts = 5, limit = 5): Promise<HardestQuiz[]> {
    interface HardestAgg {
      _id: { moduleTitle: string; lessonTitle: string; quizIndex: number; question: string };
      totalAttempts: number;
      correct: number;
    }

    const result = await this.quizAttemptModel.aggregate<HardestAgg>([
      {
        $group: {
          _id: {
            moduleTitle: '$moduleTitle',
            lessonTitle: '$lessonTitle',
            quizIndex: '$quizIndex',
            question: '$question',
          },
          totalAttempts: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
      { $match: { totalAttempts: { $gte: minAttempts } } },
      {
        $project: {
          _id: 0,
          question: '$_id.question',
          moduleTitle: '$_id.moduleTitle',
          lessonTitle: '$_id.lessonTitle',
          totalAttempts: 1,
          passRate: {
            $round: [
              { $multiply: [{ $divide: ['$correct', '$totalAttempts'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { passRate: 1 } },
      { $limit: limit },
    ]);

    return result as unknown as HardestQuiz[];
  }

  // ── Per-curriculum analytics (instructor view)

  async getCurriculumAnalytics(curriculumId: string): Promise<CurriculumAnalytics> {
    interface CurrAgg { uniqueUsers: number; totalAttempts: number; passRate: number }

    const result = await this.quizAttemptModel.aggregate<CurrAgg>([
      { $match: { userCurriculumId: new Types.ObjectId(curriculumId) } },
      {
        $group: {
          _id: null,
          uniqueUsers: { $addToSet: '$userId' },
          totalAttempts: { $sum: 1 },
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          uniqueUsers: { $size: '$uniqueUsers' },
          totalAttempts: 1,
          passRate: {
            $round: [
              { $multiply: [{ $divide: ['$correct', '$totalAttempts'] }, 100] },
              0,
            ],
          },
        },
      },
    ]);

    return result[0] ?? { uniqueUsers: 0, totalAttempts: 0, passRate: 0 };
  }
}