import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidResetTokenException extends HttpException {
  constructor() {
    super(
      { code: '10007', message: 'This reset link is invalid or has expired.' },
      HttpStatus.BAD_REQUEST,
    );
  }
}
