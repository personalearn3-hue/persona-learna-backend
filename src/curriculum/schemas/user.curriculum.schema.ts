import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Types, Schema as Mschema } from "mongoose";
import { LearningStyle, LearningPace, MediaPreference } from "../dtos/ai.dto";
import { UserDocument } from "src/users/schemas/user.schema";
import { CurriculumDocument } from "./curriculum.schema";

@Schema()
export class Quiz {
  @Prop({ type: String, required: true })
  question: string;

  @Prop({ type: [String], required: true })
  options: string[];

  @Prop({ type: String, required: true })
  correctAnswer: string;

  @Prop({ type: String, required: true })
  explanation: string;
}

// MicroLesson Schema
@Schema({ _id: false })
export class MicroLesson {
  @Prop({ type: String, required: true })
  moduleTitle: string;

  @Prop({ type: Number, required: true })
  lessonNumber: number;

  @Prop({ type: String, required: true })
  lessonTitle: string;

  @Prop({ type: String, required: true })
  duration: string; // "2-5 minutes"

  @Prop({ type: String, required: true })
  script: string; // Ready for video/audio generation

  @Prop({ type: [Quiz], default: [] })
  quizzes: Quiz[];

  // Progress tracking
  @Prop({ type: Boolean, default: false })
  isCompleted?: boolean;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Number, min: 0, max: 100 })
  quizScore?: number;

  @Prop({ type: Number, default: 0 })
  attempts?: number;

  @Prop({ type: String })
  videoUrl?: string;

  @Prop({ type: String })
  videoId?: string; // HeyGen video ID

  @Prop({ type: String, enum: ['pending', 'processing', 'completed', 'failed'] })
  videoStatus?: string;

  @Prop({ type: String })
  videoThumbnail?: string;

  @Prop({ type: Number })
  videoDuration?: number; // in seconds

  @Prop({ type: Date })
  videoGeneratedAt?: Date;
}

// Module Schema
@Schema({ _id: false })
export class Module {
  @Prop({ type: String, required: true })
  moduleTitle: string;

  @Prop({ type: Number, required: true })
  moduleNumber: number;

  @Prop({ type: String })
  summary?: string;

  @Prop({ type: String })
  recommendedDuration?: string;

  @Prop({ type: [MicroLesson], required: true })
  lessons: MicroLesson[];

  // Module progress
  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  progressPercentage?: number;

  @Prop({ type: Boolean, default: false })
  isCompleted?: boolean;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;
}

// User's learning preferences
@Schema({ _id: false })
export class UserLearningPreferences {
  @Prop({ type: String, enum: LearningStyle, required: true })
  learningStyle: LearningStyle;

  @Prop({ type: String, enum: LearningPace, required: true })
  learningPace: LearningPace;

  @Prop({ type: String, enum: MediaPreference, required: true })
  mediaPreference: MediaPreference;

  @Prop({ type: String })
  additionalPreferences?: string;
}

// Personalized curriculum metadata
@Schema({ _id: false })
export class PersonalizedMetadata {
  @Prop({ type: String })
  curriculumCreator?: string;

  @Prop({ type: String })
  institutionName?: string;

  @Prop({ type: String })
  dateCreated?: string;

  @Prop({ type: String })
  tutorName?: string;

  @Prop({ type: String })
  professorContact?: string;

  @Prop({ type: String })
  courseRequirements?: string;

  @Prop({ type: String })
  technologyRequirements?: string;

  @Prop({ type: String })
  preliminaryInfo?: string;

  @Prop({ type: String })
  estimatedTotalDuration?: string;
}

// User Curriculum (personalized version)
@Schema({ timestamps: true })
export class UserCurriculum {
  @Prop({ type: Mschema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | UserDocument;

  @Prop({ type: Mschema.Types.ObjectId, ref: 'Curriculum', required: true })
  curriculumId: Types.ObjectId | CurriculumDocument;

  @Prop({ type: String, required: true })
  courseTitle: string;

  // User's preferences used for generation
  @Prop({ type: UserLearningPreferences, required: true })
  preferences: UserLearningPreferences;

  // Personalized metadata from AI
  @Prop({ type: PersonalizedMetadata })
  metadata: PersonalizedMetadata;

  // All modules with microlessons
  @Prop({ type: [Module], required: true })
  modules: Module[];

  @Prop({ type: Number, required: true })
  totalModules: number;

  // Overall progress
  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  overallProgress: number;

  @Prop({ type: Boolean, default: false })
  isCompleted: boolean;

  // Timestamps
  @Prop({ type: Date, default: Date.now })
  enrolledAt: Date;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  lastAccessedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  // Optional: User's custom microlesson script
  @Prop({ type: String })
  userCustomScript?: string;

  // Store raw AI responses for debugging/reference
  @Prop({ type: Object })
  rawAIResponse?: {
    personalizedCurriculum: any;
    microLessons: any;
  };

  @Prop({ type: Object })
  avatarConfig?: {
    avatarId?: string;
    avatarName?: string;
    voiceId?: string;
    isCustomAvatar?: boolean;
    customAvatarUrl?: string;
  };

  // Video generation progress
  @Prop({ type: Number, default: 0 })
  videoGenerationProgress?: number; // 0-100

  @Prop({ type: String, enum: ['not_started', 'in_progress', 'completed', 'failed'] })
  videoGenerationStatus?: string;
}

export const UserCurriculumSchema = SchemaFactory.createForClass(UserCurriculum);