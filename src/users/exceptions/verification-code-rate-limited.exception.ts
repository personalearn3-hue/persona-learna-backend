import { HttpException, HttpStatus } from '@nestjs/common';

export class VerificationCodeRateLimitedException extends HttpException {
  constructor() {
    super(
      { code: '10006', message: 'Please wait before requesting another code.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
