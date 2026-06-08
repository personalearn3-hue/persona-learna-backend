import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Identifier, UsersService } from 'src/users/users.service';
import { CreateCurriculumDto } from './dtos/create.curriculum.dto';
import { Curriculum } from './schemas/curriculum.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { PdfService } from './pdf.service';
import { AIAgentService } from './ai.agents.service';
import { GenerateLearningScriptDto, LearningStyle } from './dtos/ai.dto';
import { UserCurriculum } from './schemas/user.curriculum.schema';


@Injectable()
export class CurriculumService {
    private readonly logger = new Logger(CurriculumService.name);
    constructor(
        @InjectModel('Curriculum') private curriculumModel: Model<Curriculum>,
        @InjectModel('UserCurriculum') private userCurriculumModel: Model<UserCurriculum>,
        private readonly userService: UsersService,
        private readonly pdfService: PdfService,
        private cloudinaryService: CloudinaryService,
        private aiAgentsService: AIAgentService,
    ) { }

    async createCurriculum(
        userId: Identifier,
        file: Express.Multer.File,
        dto?: CreateCurriculumDto,
    ): Promise<{ message: string; data: Curriculum; }> {
        try {
            // Upload PDF to Cloudinary
            this.logger.log('Uploading PDF to Cloudinary...');
            const uploadResult = await this.cloudinaryService.uploadImageToCloudinary(
                file,
                'curricula-pdfs',
            ) as { secure_url: string };

            // Extract text from PDF
            this.logger.log('Extracting text from PDF...');
            const extractedText = await this.pdfService.extractTextFromBuffer(uploadResult.secure_url);

            // Extract metadata
            const metadata = this.pdfService.extractMetadata(extractedText);

            // Create base curriculum (visible to everyone)
            const curriculum = await this.curriculumModel.create({
                title: dto?.title || '',
                description: dto?.description || '',
                createdBy: userId,
                pdfUrl: uploadResult.secure_url,
                extractedText,
                metadata,
                isPublished: true,
            });

            this.logger.log(`Curriculum created: ${curriculum._id}`);

            // Update creator's stats
            await this.userService.userModel.findByIdAndUpdate(userId, {
                $inc: { curriculaCreated: 1 },
            });

            return { message: "Curriculum created successfully", data: curriculum };
        } catch (error) {
            this.logger.error('Error creating curriculum:', error);
            throw error;
        }
    }

    async generatePersonalizedCurriculum(
        userId: Identifier,
        curriculumId: string,
        preference: GenerateLearningScriptDto,
        userCustomScript?: string,
    ) {
        // Check if user already has this curriculum
        const existing = await this.userCurriculumModel.findOne({
            userId: userId,
            curriculumId: curriculumId,
        });

        if (existing) {
            throw new BadRequestException('You are already enrolled in this curriculum');
        }

        const curriculum = await this.curriculumModel.findById(curriculumId);

        if (!curriculum) {
            throw new NotFoundException('Curriculum not found');
        }

        if (!curriculum.extractedText) {
            throw new BadRequestException('Curriculum has no content');
        }

        try {
            // AI Agent 1: Curriculum Personalizer
            this.logger.log('Personalizing curriculum with AI Agent 1...');
            const personalizedCurriculum = await this.aiAgentsService.personalizeCurriculum(
                curriculum.extractedText,
                preference,
                curriculum.metadata,
            );

            // AI Agent 2: MicroLesson Generator
            this.logger.log('Generating microlessons with AI Agent 2...');
            const microLessons = await this.aiAgentsService.generateMicroLessons(
                personalizedCurriculum,
                curriculum.extractedText,
                preference,
                userCustomScript,
            );
            console.log({ microLessons })

            // Save personalized curriculum
            const userCurriculum = await this.userCurriculumModel.create({
                userId: userId,
                curriculumId: curriculum._id,
                courseTitle: microLessons.courseTitle,
                preferences: {
                    learningStyle: preference.learningStyle,
                    learningPace: preference.learningPace,
                    mediaPreference: preference.mediaPreference,
                    additionalPreferences: preference.additionalPreferences,
                },
                metadata: {
                    curriculumCreator: personalizedCurriculum.curriculumCreator,
                    institutionName: personalizedCurriculum.institutionName,
                    dateCreated: personalizedCurriculum.dateCreated,
                    tutorName: personalizedCurriculum.tutorName,
                    professorContact: personalizedCurriculum.professorContact,
                    courseRequirements: personalizedCurriculum.courseRequirements,
                    technologyRequirements: personalizedCurriculum.technologyRequirements,
                    preliminaryInfo: personalizedCurriculum.preliminaryInfo,
                    estimatedTotalDuration: personalizedCurriculum.estimatedTotalDuration,
                },
                modules: microLessons.modules.map((module) => ({
                    moduleTitle: module.moduleTitle,
                    moduleNumber: module.moduleNumber,
                    summary: personalizedCurriculum.modules?.find(
                        m => m.title === module.moduleTitle,
                    )?.summary,
                    recommendedDuration: personalizedCurriculum.modules?.find(
                        m => m.title === module.moduleTitle,
                    )?.recommendedDuration,
                    lessons: module.lessons.map((lesson) => ({
                        moduleTitle: lesson.moduleTitle,
                        lessonNumber: lesson.lessonNumber,
                        lessonTitle: lesson.lessonTitle,
                        duration: lesson.duration,
                        script: lesson.script,
                        quizzes: lesson.quizzes,
                        isCompleted: false,
                        attempts: 0,
                        videoStatus: 'pending',
                    })),
                    progressPercentage: 0,
                    isCompleted: false,
                })),
                totalModules: microLessons.totalModules,
                overallProgress: 0,
                isCompleted: false,
                enrolledAt: new Date(),
                userCustomScript,
                rawAIResponse: {
                    personalizedCurriculum,
                    microLessons,
                },
                avatarConfig: {
                    avatarId: preference.avatarId,
                    voiceId: preference.voiceId || 'e0cc82c22f414c95b1f25696c732f058',
                    isCustomAvatar: !!preference.avatarId,
                },
                videoGenerationStatus: 'in_progress',
                videoGenerationProgress: 0,
            });

            console.log('User curriculum saved:', userCurriculum._id);

            // Update user's enrollment count
            await this.userService.userModel.findByIdAndUpdate(userId, {
                $inc: { curriculaEnrolled: 1 },
            });


            this.logger.log(`Personalized curriculum generated for user ${userId}`);

            this.logger.log('Starting automatic video generation for all lessons...');


            return { message: 'Personalized curriculum generated successfully' };
        } catch (error) {
            this.logger.error('Error generating personalized curriculum:', error);
            throw error;
        }
    }
}
