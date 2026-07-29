import { IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  code: string;
}
