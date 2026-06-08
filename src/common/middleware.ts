import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import { Config } from 'src/config';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger: Logger = new Logger(LoggerMiddleware.name);

  constructor(private readonly configService: ConfigService<Config, true>) {}

  use(req: Request, res: Response, next: NextFunction) {
    const isProduction = this.configService.get('isProduction', {
      infer: true,
    });

    morgan(isProduction ? 'combined' : 'dev', {
      stream: {
        write: (msg) => {
          this.logger.log(msg);
        },
      },
    })(req, res, next);
  }
}