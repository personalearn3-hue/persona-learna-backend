import * as crypto from 'node:crypto';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { EnvironmentVariables } from './environment-variables';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

export const APP_NAME = 'persona-learna';
export const TMP_DIR = path.join(os.tmpdir(), APP_NAME);

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);
console.log('tmpdir', TMP_DIR);

const env = process.env as unknown as EnvironmentVariables;

export interface CloudinaryConfig {
  cloudName: string;
  ApiKey: string;
  ApiSecret: string;
}

export interface Config {
  isProduction: boolean;
  port: number;
  mongo: { uri: string };
  cors: { origin: string[] | string };
  jwt: { secret: string; issuer: string; audience: string; expiresIn: any };
  cloudinary: CloudinaryConfig;
  heygen: {
    apiKey: string;
    testMode: boolean;
  };
}

export function configuration() {

  const randomPort = crypto.randomInt(49_152, 65_535); // using 0 might be better;

  const nodeEnv = env.NODE_ENV ?? 'development';
  const isProduction = ['prod', 'production'].includes(nodeEnv?.trim());

//   const corsOrigin = isProduction
//     ? [websiteUrl, 'https://admin.socket.io']
//     : '*';

const corsOrigin = ['*', 'https://persona-learna-backend.onrender.com'];

  const config: Config = {
    isProduction,
    port: env.PORT || randomPort,
    mongo: {
      uri: env.MONGO_URI || `mongodb://127.0.0.1:27017/${APP_NAME}`,
    },
    cors: {
      origin: corsOrigin,
    },
    jwt: {
      secret: env.JWT_SECRET || 'insecure',
      issuer: env.JWT_ISSUER || 'persona-learna',
      audience: env.JWT_AUDIENCE || 'persona-learna-users',
      expiresIn: env.JWT_EXPIRES_IN || '30d',
    },
    cloudinary: {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      ApiKey: env.CLOUDINARY_API_KEY,
      ApiSecret: env.CLOUDINARY_API_SECRET,
    },
    heygen: {
      apiKey: env.HEYGEN_API_KEY,
      testMode: env.HEYGEN_TEST_MODE === 'true',
    }
  };


  return config;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) throw new Error(errors.toString());

  return validatedConfig;
}