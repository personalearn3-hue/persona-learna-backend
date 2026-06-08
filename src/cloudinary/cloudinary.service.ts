import { BadRequestException, Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
    private bufferToStream(buffer: Buffer): Readable {
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        return stream;
    }

    async uploadFinalVideoToCloudinary(
        videoPath: string,
        lessonTitle: string,
    ) {
        const result = await v2.uploader.upload(videoPath, {
            resource_type: 'auto',
            folder: 'lesson-videos',
            public_id: lessonTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase(),
        });

        return result.secure_url;
    }


    async uploadImage(
        file: Express.Multer.File,
        folder: string,
    ): Promise<UploadApiResponse | UploadApiErrorResponse> {
        if (!file || !file.buffer) {
            throw new BadRequestException('Invalid or missing file buffer');
        }

        return new Promise((resolve, reject) => {
            const upload = v2.uploader.upload_stream({ folder }, (error, result) => {
                if (error) {
                    console.error('Cloudinary Error:', error.message, error.http_code);
                    return reject(error);
                }

                if (!result) {
                    return reject(new Error('Upload failed: No result returned from Cloudinary'));
                }

                resolve(result);
            });

            try {
                const fileStream = this.bufferToStream(file.buffer);
                fileStream.pipe(upload);
            } catch (streamError) {
                console.error('Stream Error:', streamError.message);
                reject(streamError);
            }
        });
    }

    async uploadImageToCloudinary(file: Express.Multer.File, folder: string) {
        return new Promise((resolve, reject) => {
            const uploadStream = v2.uploader.upload_stream(
                {
                    resource_type: 'raw',
                    folder: folder,
                    public_id: file.originalname,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            uploadStream.end(file.buffer);
        });
    }


    async uploadVideoFromUrl(
        videoUrl: string,
        folder: string = 'lesson-videos',
    ): Promise<UploadApiResponse> {
        try {
            console.log('Uploading video to Cloudinary from URL:', videoUrl);

            // Cloudinary automatically downloads and uploads from the URL
            // This works with Runway's video URLs directly!
            const result = await v2.uploader.upload(videoUrl, {
                resource_type: 'raw',
                folder: folder,
                type: 'upload',
                // Optional: Add timeout for large videos
                timeout: 120000, // 2 minutes timeoute
            });

            console.log('Video uploaded to Cloudinary:', result.public_id);
            return result;
        } catch (error) {
            console.error('Failed to upload video from URL:', error);
            throw new BadRequestException('Failed to upload video to Cloudinary');
        }
    }


}