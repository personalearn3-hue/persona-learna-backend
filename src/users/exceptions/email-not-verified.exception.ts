import { HttpException, HttpStatus } from '@nestjs/common';

export class EmailNotVerifiedException extends HttpException {
  constructor() {
    super(
      { code: '10004', message: 'Please verify your email before logging in.' },
      HttpStatus.FORBIDDEN,
    );
  }
}
