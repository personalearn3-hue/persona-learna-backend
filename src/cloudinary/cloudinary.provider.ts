import { v2 } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Config } from 'src/config';

export const CLOUDINARY = 'Cloudinary';

export const CloudinaryProvider = {
    provide: CLOUDINARY,
    useFactory: (configService: ConfigService<Config, true>): void => {
        const cloudName = configService.get<string>('cloudinary.cloudName', { infer: true });
        const apiKey = configService.getOrThrow<string>('cloudinary.ApiKey', { infer: true });
        const apiSecret = configService.getOrThrow<string>('cloudinary.ApiSecret', { infer: true });

        v2.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
        });
    },
    inject: [ConfigService],
};