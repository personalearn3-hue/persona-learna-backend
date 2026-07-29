import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidVerificationCodeException extends HttpException {
  constructor() {
    super(
      { code: '10005', message: 'Invalid or expired code.' },
      HttpStatus.BAD_REQUEST,
    );
  }
}
