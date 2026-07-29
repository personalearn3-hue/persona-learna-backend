import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
} from 'class-validator';


export enum NodeEnv {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
}

export class EnvironmentVariables {
  @Max(65535)
  @Min(0)
  PORT: number;

  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv;

  // @IsUrl({ protocols: ['mongo', 'mongodb+srv', 'mongodb'], require_protocol: true })
  @IsOptional()
  MONGO_URI: string;

  @IsString()
  @IsOptional()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME: string

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY: string

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET: string


  @IsString()
  @IsOptional()
  JWT_ISSUER: string;

  @IsString()
  @IsOptional()
  JWT_AUDIENCE: string;

  @Matches(/^\d+[shd]?$/)
  @IsOptional()
  JWT_EXPIRES_IN: string;

  @IsString()
  @IsOptional()
  HEYGEN_API_KEY: string

  @IsString()
  @IsOptional()
  HEYGEN_TEST_MODE: string

  @IsString()
  @IsOptional()
  SMTP_HOST: string

  @IsString()
  @IsOptional()
  SMTP_PORT: string

  @IsString()
  @IsOptional()
  SMTP_USER: string

  @IsString()
  @IsOptional()
  SMTP_PASS: string

  @IsString()
  @IsOptional()
  MAIL_FROM: string

  @IsString()
  @IsOptional()
  FRONTEND_URL: string
}