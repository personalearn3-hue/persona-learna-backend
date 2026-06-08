import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Schema as MSchema } from 'mongoose';

// Explicit timestamp interface so all services can type createdAt safely
export interface QuizAttemptTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

export type QuizAttemptDocument = QuizAttempt & QuizAttemptTimestamps & Document;

@Schema({ timestamps: true })
export class QuizAttempt {
  // ── References ────────────────────────────────────────────────────────────
  @Prop({ type: MSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'UserCurriculum', required: true, index: true })
  userCurriculumId: Types.ObjectId;

  // ── Location within curriculum ────────────────────────────────────────────
  @Prop({ type: Number, required: true })
  moduleNumber: number;

  @Prop({ type: String, required: true })
  moduleTitle: string;

  @Prop({ type: Number, required: true })
  lessonNumber: number;

  @Prop({ type: String, required: true })
  lessonTitle: string;

  // 0-based index of the quiz within the lesson's quizzes array
  @Prop({ type: Number, required: true })
  quizIndex: number;

  @Prop({ type: String, required: true })
  question: string;

  // ── Attempt data ──────────────────────────────────────────────────────────
  @Prop({ type: String, required: true })
  selectedOption: string;

  @Prop({ type: String, required: true })
  correctAnswer: string;

  @Prop({ type: Boolean, required: true })
  isCorrect: boolean;

  /**
   * Which attempt number is this for this specific quiz?
   * 1 = first try, 2 = second try, etc.
   * Drives "how many retries does it take to pass?" analytics.
   */
  @Prop({ type: Number, required: true, min: 1 })
  attemptNumber: number;

  // createdAt / updatedAt are added automatically by { timestamps: true }
}

export const QuizAttemptSchema = SchemaFactory.createForClass(QuizAttempt);

// ── Compound indexes for fast analytics aggregation queries ───────────────
QuizAttemptSchema.index({ userId: 1, userCurriculumId: 1 });
QuizAttemptSchema.index({ userCurriculumId: 1, moduleNumber: 1, lessonNumber: 1, quizIndex: 1 });
QuizAttemptSchema.index({ createdAt: 1 }); // growth-over-time queries