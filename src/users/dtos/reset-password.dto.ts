import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @Matches(/^(?=.*\d).{8,}$/, {
    message: 'Password must be at least 8 characters and contain at least one number',
  })
  password: string;
}
