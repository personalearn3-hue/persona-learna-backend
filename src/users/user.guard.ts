import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from './users.service';
import { isValidObjectId, Types } from 'mongoose';
import { UserNotFoundException } from './exceptions';

export type UserPopulatedRequest = Request & { user: { id: Types.ObjectId } };

@Injectable()
export class UserGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    const token = this.extractTokenFromHeader(request);

    if (!token)
      throw new BadRequestException({ message: 'Token not present!' });

    let payload: { sub: string; typ: string };
    try {
      payload = await this.jwtService.verifyAsync(token);

      if (!isValidObjectId(payload.sub) || payload.typ !== 'user')
        throw new Error();
    } catch {
      throw new UnauthorizedException({ message: 'Invalid token!' });
    }

    const user = await this.userService.userModel
      .findById(payload.sub)
      .select('_id')
      .lean()
      .exec();

    if (!user) throw new UserNotFoundException();

    request['user'] = { id: user._id };

    return true;
  }

  private extractTokenFromHeader(req: Request): string | undefined {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}