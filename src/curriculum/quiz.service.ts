import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import OpenAI from 'openai';
import { UserCurriculum } from './schemas/user.curriculum.schema';
import { QuizAttempt, QuizAttemptDocument } from './schemas/quizz.attempt.schema';
import { Identifier } from 'src/users/users.service';

export interface QuizAttemptResult {
  isCorrect: boolean;
  selectedOption: string;
  correctAnswer: string;
  message: string;
  explanation: string;
  attemptNumber: number;
}

export interface QuizExplanationResult {
  furtherExplanation: string;
  question: string;
  selectedOption: string;
  correctAnswer: string;
  isCorrect: boolean;
}

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);
  private openai: OpenAI;

  constructor(
    @InjectModel(UserCurriculum.name)
    private userCurriculumModel: Model<UserCurriculum>,
    @InjectModel(QuizAttempt.name)
    private quizAttemptModel: Model<QuizAttemptDocument>,
  ) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ATTEMPT QUIZ
  // ──────────────────────────────────────────────────────────────────────────

  async attemptQuiz(
    userId: Identifier,
    userCurriculumId: string,
    moduleNumber: number,
    lessonNumber: number,
    quizIndex: number,
    selectedOption: string,
  ): Promise<QuizAttemptResult> {
    const userCurriculum = await this.userCurriculumModel.findById(userCurriculumId);
    if (!userCurriculum) throw new NotFoundException('User curriculum not found');

    const mod = userCurriculum.modules.find(m => m.moduleNumber === moduleNumber);
    if (!mod) throw new NotFoundException(`Module ${moduleNumber} not found`);

    const lesson = mod.lessons.find(l => l.lessonNumber === lessonNumber);
    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonNumber} not found in module ${moduleNumber}`);
    }

    if (!lesson.quizzes || quizIndex >= lesson.quizzes.length) {
      throw new NotFoundException(`Quiz at index ${quizIndex} not found`);
    }

    const quiz = lesson.quizzes[quizIndex];
    const normalise = (s: string) => s.trim().toUpperCase();
    const isCorrect = normalise(selectedOption) === normalise(quiz.correctAnswer);

    // ── How many times has this user attempted THIS specific quiz? ──────────
    const priorAttempts = await this.quizAttemptModel.countDocuments({
      userId: new Types.ObjectId(userId),
      userCurriculumId: new Types.ObjectId(userCurriculumId),
      moduleNumber,
      lessonNumber,
      quizIndex,
    });
    const attemptNumber = priorAttempts + 1;

    // ── Persist the attempt record to its own collection ───────────────────
    await this.quizAttemptModel.create({
      userId: new Types.ObjectId(userId),
      userCurriculumId: new Types.ObjectId(userCurriculumId),
      moduleNumber,
      moduleTitle: mod.moduleTitle,
      lessonNumber,
      lessonTitle: lesson.lessonTitle,
      quizIndex,
      question: quiz.question,
      selectedOption,
      correctAnswer: quiz.correctAnswer,
      isCorrect,
      attemptNumber,
    });

    // ── Keep lesson-level counters in sync on UserCurriculum ───────────────
    // These are "quick read" fields — avoids hitting the aggregation pipeline
    // every time the UI needs a simple score badge
    lesson.attempts = (lesson.attempts ?? 0) + 1;

    // Recalculate quizScore for this lesson: % correct across ALL attempts
    const lessonAttempts = await this.quizAttemptModel.find({
      userId: new Types.ObjectId(userId),
      userCurriculumId: new Types.ObjectId(userCurriculumId),
      moduleNumber,
      lessonNumber,
    });
    const correctCount = lessonAttempts.filter(a => a.isCorrect).length;
    lesson.quizScore = Math.round((correctCount / lessonAttempts.length) * 100);

    await userCurriculum.save();

    return {
      isCorrect,
      selectedOption,
      correctAnswer: quiz.correctAnswer,
      message: isCorrect
        ? '✅ Correct! Well done.'
        : `❌ Not quite. The correct answer is "${quiz.correctAnswer}".`,
      explanation: quiz.explanation,
      attemptNumber,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // EXPLAIN QUIZ
  // ──────────────────────────────────────────────────────────────────────────

  async explainQuiz(
    userCurriculumId: string,
    moduleNumber: number,
    lessonNumber: number,
    quizIndex: number,
    selectedOption: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ): Promise<QuizExplanationResult> {
    const userCurriculum = await this.userCurriculumModel.findById(userCurriculumId);
    if (!userCurriculum) throw new NotFoundException('User curriculum not found');

    const mod = userCurriculum.modules.find(m => m.moduleNumber === moduleNumber);
    if (!mod) throw new NotFoundException(`Module ${moduleNumber} not found`);

    const lesson = mod.lessons.find(l => l.lessonNumber === lessonNumber);
    if (!lesson) {
      throw new NotFoundException(`Lesson ${lessonNumber} not found in module ${moduleNumber}`);
    }

    if (!lesson.quizzes || quizIndex >= lesson.quizzes.length) {
      throw new NotFoundException(`Quiz at index ${quizIndex} not found`);
    }

    const quiz = lesson.quizzes[quizIndex];
    const normalise = (s: string) => s.trim().toUpperCase();
    const isCorrect = normalise(selectedOption) === normalise(quiz.correctAnswer);

    const systemPrompt = `You are a focused quiz tutor. Your ONLY job is to help a student understand a specific quiz question from a lesson they just studied.

STRICT RULES:
1. ONLY explain concepts that appear in the lesson script provided below.
2. ONLY discuss this specific quiz question and its answer options.
3. Do NOT introduce new topics, tangents, or information outside the lesson script.
4. Do NOT answer any question that is unrelated to this quiz question.
5. If the student asks something off-topic, gently redirect them back to the question.
6. Adjust your explanation style based on what the student still seems confused about from prior messages.
7. Keep explanations clear, concise, and student-friendly — break things down step by step when needed.

LESSON SCRIPT (your only source of truth):
"""
${lesson.script}
"""

QUIZ QUESTION CONTEXT:
- Question: ${quiz.question}
- Options: ${quiz.options.join(' | ')}
- Correct Answer: ${quiz.correctAnswer}
- Built-in Explanation: ${quiz.explanation}
- Student Selected: ${selectedOption}
- Was Student Correct: ${isCorrect ? 'YES' : 'NO'}`;

    const firstUserMessage = isCorrect
      ? `I answered "${selectedOption}" and got it right! Can you help me understand WHY this is the correct answer based on what I learned in the lesson?`
      : `I answered "${selectedOption}" but the correct answer is "${quiz.correctAnswer}". Can you help me understand why I was wrong and break down this question for me?`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: firstUserMessage },
      ...conversationHistory,
    ];

    try {
      this.logger.log(
        `Quiz Explanation Agent — module ${moduleNumber}, lesson ${lessonNumber}, quiz ${quizIndex}`,
      );

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 600,
        temperature: 0.4,
      });

      const responseText = completion.choices[0].message.content;
      if (!responseText) throw new Error('Empty response from OpenAI');

      return {
        furtherExplanation: responseText.trim(),
        question: quiz.question,
        selectedOption,
        correctAnswer: quiz.correctAnswer,
        isCorrect,
      };
    } catch (error) {
      this.logger.error('Error in Quiz Explanation Agent:', error);
      throw error;
    }
  }
}