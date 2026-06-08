import { Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config';
import { GenerateLearningScriptDto } from './dtos/ai.dto';
import { MicroLessonOutput, PersonalizedCurriculum } from './enums/ai.enums';

export class AIAgentService {
    private readonly logger = new Logger(AIAgentService.name);

    private openai: OpenAI;
    constructor(private configService: ConfigService<Config, true>) {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        })
    }

    async personalizeCurriculum(
        curriculumText: string,
        preference: GenerateLearningScriptDto,
        metadata?: any,
    ) {
        const systemPrompt = `You are an expert curriculum creator. Use ONLY the provided context. You will be provided with a course curriculum file. The course curriculum is already added. Read the content of the course curriculum and build a personalized course outline tailored to the student's preferences.

The output must have name of the curriculum creator, university or institution name listed in the file, Date Created, Tutor/Professor/Coach Name, any preliminary information contained in the file such as about the professor, contact of the professor, course requirements, technology requirements, etc.

You MUST output valid JSON with this exact structure:
{
  "courseTitle": "string",
  "curriculumCreator": "string",
  "institutionName": "string",
  "dateCreated": "string",
  "tutorName": "string",
  "preliminaryInfo": "string",
  "professorContact": "string",
  "courseRequirements": "string",
  "technologyRequirements": "string",
  "studentName": "string",
  "estimatedTotalDuration": "string (e.g., '8 weeks')",
  "modules": [
    {
      "title": "string",
      "summary": "string",
      "recommendedDuration": "string (e.g., '1 week')"
    }
  ]
}`;

        const userPrompt = `Curriculum Content:
${curriculumText}

Student Preferences:
- Learning Style: ${preference.learningStyle}
- Learning Pace: ${preference.learningPace}
- Media Preference: ${preference.mediaPreference}
${preference.additionalPreferences ? `- Additional Preferences: ${preference.additionalPreferences}` : ''}

${metadata ? `\nExtracted Metadata:\n${JSON.stringify(metadata, null, 2)}` : ''}

Create a personalized curriculum outline for this student. Respond ONLY with valid JSON, no other text.`;

        try {
            this.logger.log('Calling Curriculum Personalizer Agent...');

            const completion = await this.openai.chat.completions.create({
                model: "gpt-5-nano",
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                response_format: { type: 'json_object' },
            });

            const responseText = completion.choices[0].message.content;
            if (!responseText) {
                throw new Error('Empty response from OpenAI');
            }
            const result = JSON.parse(responseText);

            this.logger.log('Curriculum personalization completed');
            return result as PersonalizedCurriculum;
        } catch (error) {
            this.logger.error('Error in Curriculum Personalizer:', error);
            throw error;
        }
    }

    async generateMicroLessons(
        personalizedCurriculum: PersonalizedCurriculum,
        curriculumText: string,
        preference: GenerateLearningScriptDto,
        userMicroLessonScript?: string,
    ): Promise<MicroLessonOutput> {
        const systemPrompt = `You are a microlesson creator. For each of the topics in the curriculum, create them into modules and for each module, break the course into microlessons of 2 - 5 minutes. Write lesson script for each microlesson. Add 1 - 2 Quiz at the end of each microlesson.

${userMicroLessonScript ? 'The user has provided their own microlesson script. Use the content of the microlesson teaching script submitted by the user and personalize it to the student. Ensure to stay within the content of the attached script.' : ''}

Ensure that the lessons are tailored to the student preferences. You must only generate content strictly following the content in the curriculum file.

YOU MUST CREATE EACH MICROLESSON SUCH THAT THEY ARE READY TO BE FED INTO VIDEO/AUDIO-GENERATING AI depending on the media choice in the student profile. Prepare the script to produce quality audio or video.

CRITICAL LIMITATIONS FOR FREE TIER:
1. Generate ONLY 2 modules (not all modules)
2. Each module should have ONLY 1 lesson
3. Total of 1 lessons across 1 modules
4. Focus on the most important foundational topics

IMPORTANT:
1. You have autonomy in deciding how to tailor the lesson based on the student profile and media of choice.
2. Each lesson script should be comprehensive enough to stand alone as an introduction to that module's topic.

You MUST output valid JSON with this structure:
{
  "courseTitle": "string",
  "studentName": "string",
  "totalModules": 2,
  "modules": [
    {
      "moduleTitle": "string",
      "moduleNumber": 1,
      "lessons": [
        {
          "moduleTitle": "string",
          "lessonNumber": 1,
          "lessonTitle": "string",
          "duration": "2-5 minutes",
          "script": "Full lesson script ready for video/audio generation",
          "quizzes": [
            {
              "question": "string",
              "options": ["A", "B", "C", "D"],
              "correctAnswer": "string",
              "explanation": "string"
            }
          ]
        }
      ]
    },
    {
      "moduleTitle": "string",
      "moduleNumber": 2,
      "lessons": [
        {
          "moduleTitle": "string",
          "lessonNumber": 1,
          "lessonTitle": "string",
          "duration": "2-5 minutes",
          "script": "Full lesson script ready for video/audio generation",
          "quizzes": [
            {
              "question": "string",
              "options": ["A", "B", "C", "D"],
              "correctAnswer": "string",
              "explanation": "string"
            }
          ]
        }
      ]
    }
  ]
}`;

        const userPrompt = `Personalized Curriculum:
${JSON.stringify(personalizedCurriculum, null, 2)}

Original Curriculum Content:
${curriculumText}

Student Preferences:
- Learning Style: ${preference.learningStyle}
- Learning Pace: ${preference.learningPace}
- Media Preference: ${preference.mediaPreference}
${preference.additionalPreferences ? `- Additional Preferences: ${preference.additionalPreferences}` : ''}

${userMicroLessonScript ? `\nUser's MicroLesson Script:\n${userMicroLessonScript}` : ''}

IMPORTANT: Generate ONLY the first 1 module with 1 lesson each (1 lessons total). Focus on the most foundational and important topics from the curriculum. Each lesson must be 30 seconds with scripts ready for ${preference.mediaPreference} generation. 

Respond ONLY with valid JSON, no other text.`;

        try {
            this.logger.log('Calling MicroLesson Generator Agent...');

            const completion = await this.openai.chat.completions.create({
                model: "gpt-5-nano",
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                response_format: { type: 'json_object' },
            });

            const responseText = completion.choices[0].message.content;
            if (!responseText) {
                throw new Error('Empty response from OpenAI');
            }
            const result = JSON.parse(responseText);
            console.log({ result })

            // Validate and enforce limits
            if (result.totalModules > 1) {
                this.logger.warn(`AI generated ${result.totalModules} modules, limiting to 2`);
                result.modules = result.modules.slice(0, 2);
                result.totalModules = 1;
            }

            // Ensure each module has only 1 lesson
            result.modules = result.modules.map((module, index) => {
                if (module.lessons.length > 1) {
                    this.logger.warn(`Module ${index + 1} has ${module.lessons.length} lessons, limiting to 1`);
                    module.lessons = [module.lessons[0]];
                }
                return module;
            });

            this.logger.log(`MicroLesson generation completed. Generated ${result.totalModules} modules with ${result.modules.reduce((sum, m) => sum + m.lessons.length, 0)} total lessons`);

            return result as MicroLessonOutput;
        } catch (error) {
            this.logger.error('Error in MicroLesson Generator:', error);
            throw error;
        }
    }
}