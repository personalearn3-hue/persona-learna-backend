import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserMethods } from './schemas/methods';
import { UserAlreadyExistsException } from './exceptions';
import { LoginDto } from './dtos/login.dto';
import { SignupDto } from './dtos/signup.dto';

export type Identifier = Types.ObjectId;

@Injectable()
export class UsersService {
    private readonly logger: Logger = new Logger(UsersService.name);

    constructor(
        @InjectModel(User.name)
        readonly userModel: Model<UserDocument, object, UserMethods>,
        private readonly jwtService: JwtService,
    ) { }

    async signup(dto: SignupDto) {

        let user = await this.userModel
            .findOne({
                $or: [{ 'email.value': dto['email'] }],
            })
            .exec();

        console.log({ dto });

        if (user) throw new UserAlreadyExistsException();

        user = await this.userModel.create({
            ...dto, email: {
                value: dto.email,
            },
        });

        const token = await this.jwtService.signAsync({
            sub: user._id,
            typ: 'user',
        });

        return { message: 'User signup successful!', data: { user, token } };
    }

    async login(dto: LoginDto) {
        const user = await this.userModel
            .findOne({ 'email.value': dto.email })
            .exec();

        if (!user || !(await user.verifyHash('password', dto.password)))
            throw new BadRequestException({ message: 'Invalid credentials!' });

        const token = await this.jwtService.signAsync({
            sub: user.id,
            typ: 'user',
        });

        return { message: 'User login successful!', data: { user, token } };
    }
}
