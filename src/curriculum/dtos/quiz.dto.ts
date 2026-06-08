import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConversationMessageDto {
  @IsEnum(['user'])
  role: 'user';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AttemptQuizDto {
  @IsNumber()
  @Min(1)
  moduleNumber: number;

  @IsNumber()
  @Min(1)
  lessonNumber: number;

  @IsNumber()
  @Min(0)
  quizIndex: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['A', 'B', 'C', 'D'])
  selectedOption: string;
}

export class ExplainQuizDto {
  @IsNumber()
  @Min(1)
  moduleNumber: number;

  @IsNumber()
  @Min(1)
  lessonNumber: number;

  @IsNumber()
  @Min(0)
  quizIndex: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['A', 'B', 'C', 'D'])
  selectedOption: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  conversationHistory?: ConversationMessageDto[];
}