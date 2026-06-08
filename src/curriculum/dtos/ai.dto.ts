import { IsEnum, IsString, IsOptional, IsNotEmpty, IsBoolean } from 'class-validator';

export enum LearningStyle {
  VISUAL = 'visual',
  AUDIO = 'audio',
  READING = 'reading',
  KINESTHETIC = 'kinesthetic',
}

export enum MediaPreference {
  VIDEO = 'video',
  AUDIO = 'audio',
  TEXT = 'text',
  MIXED = 'mixed',
}

export enum LearningPace {
  SLOW = 'slow',
  FAST = 'fast',
  MODERATE = 'moderate',
}

export enum GenerationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class LearningPreferencesDto {
  @IsEnum(LearningStyle)
  @IsNotEmpty()
  learningStyle: LearningStyle;

  @IsEnum(LearningPace)
  @IsNotEmpty()
  learningPace: LearningPace;

  @IsEnum(MediaPreference)
  @IsNotEmpty()
  mediaPreference: MediaPreference;

  @IsString()
  @IsOptional()
  avatarId?: string;

  @IsString()
  @IsOptional()
  background?: string;

  @IsString()
  @IsOptional()
  voiceId?: string;

  @IsString()
  @IsOptional()
  additionalPreferences?: string;
  
  @IsBoolean()
  @IsOptional()
  usingCustomAvatar? : boolean
}

export class GenerateLearningScriptDto extends LearningPreferencesDto {
  @IsOptional()
  temperature?: number; // 0-2, controls randomness

  @IsOptional()
  maxTokens?: number; // Maximum length of response

  @IsOptional()
  topP?: number; // Nucleus sampling parameter
}