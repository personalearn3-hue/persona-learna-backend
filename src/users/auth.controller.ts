import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @HttpCode(HttpStatus.OK)
  @Post('/forgot-password')
  forgotPassword(@Req() req: Request, @Body() body: ForgotPasswordDto) {
    return this.usersService.forgotPassword(body, req.ip ?? '');
  }

  @HttpCode(HttpStatus.OK)
  @Post('/reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.usersService.resetPassword(body);
  }
}
