import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { VerifyEmailDto } from './dtos/verify-email.dto';
import * as userGuard from './user.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('/signup')
  signup(@Body() body: SignupDto) {
    return this.usersService.signup(body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/login')
  login(@Body() body: LoginDto) {
    return this.usersService.login(body);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(userGuard.UserGuard)
  @Post('/verify-email')
  verifyEmail(
    @Req() req: userGuard.UserPopulatedRequest,
    @Body() body: VerifyEmailDto,
  ) {
    return this.usersService.verifyEmail(req.user.id, body.code);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(userGuard.UserGuard)
  @Post('/resend-verification-code')
  resendVerificationCode(@Req() req: userGuard.UserPopulatedRequest) {
    return this.usersService.resendVerificationCode(req.user.id);
  }
}
