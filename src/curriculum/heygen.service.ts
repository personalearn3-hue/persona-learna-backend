import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";

export interface HeyGenUploadResponse {
    code: number;
    data: {
        id: string;
        name: string;
        file_type: 'image' | 'video' | 'audio';
        folder_id: string;
        meta: string | null;
        created_ts: number;
        url: string;
        image_key: string | null;
    };
    msg: string | null;
    message: string | null;
}

export interface TrainAvatarResponse {
    error: null | string;
    data: {
        code: number;
        data: null;
        msg: string | null;
        message: string | null;
    };
}

export interface CreateAvatarGroupResponse {
    error: null | string;
    data: {
        id: string;
        image_url: string;
        created_at: number;
        name: string;
        status: 'pending' | 'ready' | 'failed' | 'completed';
        group_id: string;
        is_motion: boolean;
        motion_preview_url: string | null;
        business_type: string;
        upscale_availability: {
            available: boolean;
            reason: string;
        };
        upscaled: boolean;
        background_sound_effect: string | null;
    };
}


@Injectable()
export class HeyGenService {
    private readonly logger = new Logger(HeyGenService.name);
    private readonly apiKey: string;
    private readonly apiUrl = 'https://api.heygen.com/v2';
    private readonly baseUrl = 'https://upload.heygen.com';
    private readonly isTestMode: boolean;
    private readonly videoConfig: {
        width: number;
        height: number;
        aspectRatio: string;
    };

    private readonly defaultTemplateId = 'YOUR_TEMPLATE_ID_HERE';

    constructor(
        private configService: ConfigService,
        private readonly cloudinaryService: CloudinaryService
    ) {
        this.apiKey = this.configService.getOrThrow<string>('HEYGEN_API_KEY');

        if (!this.apiKey) {
            this.logger.error('HEYGEN_API_KEY is not configured');
        }

        this.isTestMode = this.configService.getOrThrow<string>('HEYGEN_TEST_MODE', 'true', { infer: true }) === 'true';
        console.log(this.isTestMode)

        if (this.isTestMode) {
            this.logger.log('HeyGen running in TEST MODE (free tier) - 720x480 resolution');
            this.videoConfig = {
                width: 720,
                height: 480,
                aspectRatio: '16:9',
            };
        } else {
            this.logger.log('HeyGen running in PRODUCTION MODE - 1920x1080 resolution');
            this.videoConfig = {
                width: 1920,
                height: 1080,
                aspectRatio: '16:9',
            };
        }
    }

    async uploadPhotoAvatar(name: string, imageFile: Express.Multer.File) {
        const uploadResult = await this.cloudinaryService.uploadImage(imageFile, 'heygen-avatars',)
        const imageResult = uploadResult.secure_url
        if (!imageResult) {
            throw new BadRequestException('Failed to retrieve image URL from Cloudinary');
        }

        const requestBody = {
            type: "photo",
            name: name,
            file: { type: 'url', url: imageResult },
        }
        const response = await axios.post("https://api.heygen.com/v3/avatars", requestBody, {
            headers: {
                "x-api-key": this.apiKey,
                'Content-Type': 'application/json',
            }
        })

        return response.data
    }


    async uploadAsset(
        fileBuffer: Buffer,
        mimeType: string,
    ): Promise<HeyGenUploadResponse> {
        try {
            this.logger.log(`Uploading file with MIME type: ${mimeType}`);

            const response = await axios.post<HeyGenUploadResponse>(
                `${this.baseUrl}/v1/asset`,
                fileBuffer,
                {
                    headers: {
                        'X-API-KEY': this.apiKey,
                        'Content-Type': mimeType,
                    },
                },
            );

            this.logger.log(`Upload successful. Asset ID: ${response.data.data.id}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Upload failed: ${error.message}`, error.response.data);
            throw error;
        }
    }

    async createAvatarGroup(
        imageKey: string,
        name: string,
    ): Promise<CreateAvatarGroupResponse> {
        try {
            this.logger.log(`Creating avatar group with name: ${name}`);

            const response = await axios.post<CreateAvatarGroupResponse>(
                `${this.apiUrl}/photo_avatar/avatar_group/create`,
                {
                    name: name,
                    image_key: imageKey,
                },
                {
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-Api-Key': this.apiKey,
                    },
                },
            );

            console.log({ response })

            this.logger.log(`Avatar group created. Group ID: ${response.data.data.group_id}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Create avatar group failed: ${error.response.data}`, error.stack);
            throw error;
        }
    }

    async trainAvatarGroup(groupId: string): Promise<TrainAvatarResponse> {
        try {
            this.logger.log(`Training avatar group: ${groupId}`);

            const response = await axios.post<TrainAvatarResponse>(
                `${this.apiUrl}/photo_avatar/train`,
                {
                    group_id: groupId,
                },
                {
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-Api-Key': this.apiKey,
                    },
                },
            );

            this.logger.log(`Training started for group: ${groupId}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Training failed: ${error.message}`, error.response.data);
            throw error;
        }
    }

    async getAvatarGroupStatus(id: string): Promise<CreateAvatarGroupResponse> {
        try {
            const response = await axios.get<CreateAvatarGroupResponse>(
                `${this.apiUrl}/photo_avatar/${id}`,
                {
                    headers: {
                        'accept': 'application/json',
                        'X-Api-Key': this.apiKey,
                    },
                },
            );

            this.logger.log(`Avatar group status for ${id}: ${response.data.data.status}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Get avatar group status failed: ${error.response.message}`, error.response.data);
            throw error;
        }
    }

    // ========== 6. WAIT FOR AVATAR GROUP TO BE READY ==========
    async waitForAvatarReady(
        id: string,
        maxWaitTimeMs: number = 300000, // 5 minutes default
        pollIntervalMs: number = 5000, // Check every 5 seconds
    ): Promise<CreateAvatarGroupResponse> {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTimeMs) {
            try {
                const status = await this.getAvatarGroupStatus(id);

                if (status.data.status === 'completed') {
                    this.logger.log(`Avatar group ${id} is ready!`);
                    return status;
                }

                if (status.data.status === 'failed') {
                    throw new Error(`Avatar group ${id} failed to process`);
                }

                this.logger.log(
                    `Avatar group ${id} is ${status.data.status}, waiting ${pollIntervalMs}ms...`,
                );

                // Wait before next check
                await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
            } catch (error) {
                this.logger.error(`Error checking avatar status: ${error.response.data}`);
                throw error;
            }
        }

        throw new Error(`Avatar group ${id} did not become ready within ${maxWaitTimeMs}ms`);
    }

    async uploadAndCreateAvatar(
        fileBuffer: Buffer,
        mimeType: string,
        avatarName: string,
    ): Promise<{
        uploadResult: HeyGenUploadResponse;
        avatarGroup: CreateAvatarGroupResponse;
    }> {
        try {
            // Step 1: Upload image
            const uploadResult = await this.uploadAsset(fileBuffer, mimeType);

            if (!uploadResult.data.image_key) {
                throw new Error('Upload succeeded but no image_key returned');
            }

            // Step 2: Create avatar group
            const avatarGroup = await this.createAvatarGroup(
                uploadResult.data.image_key,
                avatarName,
            );

            return {
                uploadResult,
                avatarGroup,
            };
        } catch (error) {
            this.logger.error(`Upload and create avatar failed: ${error.response.message}`, error.response.data);
            throw error;
        }
    }

    // ========== COMPLETE FLOW: UPLOAD, CREATE, AND TRAIN ==========
    async createAndTrainAvatar(
        fileBuffer: Buffer,
        mimeType: string,
        avatarName: string,
    ): Promise<{
        uploadResult: HeyGenUploadResponse;
        avatarGroup: CreateAvatarGroupResponse;
        trainingResult: TrainAvatarResponse;
        groupId: string;
    }> {
        try {
            // Step 1 & 2: Upload and create avatar group
            const { uploadResult, avatarGroup } = await this.uploadAndCreateAvatar(
                fileBuffer,
                mimeType,
                avatarName,
            );

            this.logger.log('Waiting for avatar group to be ready before training...');
            await this.waitForAvatarReady(avatarGroup.data.id);

            // Step 3: Train the avatar group
            const trainingResult = await this.trainAvatarGroup(avatarGroup.data.group_id);

            return {
                uploadResult,
                avatarGroup,
                trainingResult,
                groupId: avatarGroup.data.group_id,
            };
        } catch (error) {
            this.logger.error(`Create and train avatar failed: ${error.response.data.message}`, error.response.data);
            throw error;
        }
    }

    async getAvailableAvatars(): Promise<any[]> {
        try {
            const response = await axios.get(
                `${this.apiUrl}/avatars`,
                {
                    headers: {
                        'X-Api-Key': this.apiKey,
                    },
                },
            );

            return response.data.data.avatars;
        } catch (error) {
            this.logger.error('Error fetching avatars:', error.response.data);
            throw error;
        }
    }
}