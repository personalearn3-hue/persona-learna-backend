import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import * as crypto from 'node:crypto';
import { User, UserDocument } from './schemas/user.schema';
import { UserMethods } from './schemas/methods';
import { PasswordResetToken, PasswordResetTokenDocument } from './schemas/password-reset-token.schema';
import { PasswordResetAttempt, PasswordResetAttemptDocument } from './schemas/password-reset-attempt.schema';
import {
    UserAlreadyExistsException,
    UserNotFoundException,
    EmailNotVerifiedException,
    InvalidVerificationCodeException,
    VerificationCodeRateLimitedException,
    InvalidResetTokenException,
} from './exceptions';
import { LoginDto } from './dtos/login.dto';
import { SignupDto } from './dtos/signup.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { MailService } from 'src/mail/mail.service';
import { Config } from 'src/config';
import {
    VERIFICATION_RESEND_COOLDOWN_MS,
    PASSWORD_RESET_TOKEN_TTL_MS,
    PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
    PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS,
} from './constants';

export type Identifier = Types.ObjectId;

const GENERIC_FORGOT_PASSWORD_MESSAGE =
    'If an account exists for that email, a reset link has been sent.';

function hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class UsersService {
    private readonly logger: Logger = new Logger(UsersService.name);

    constructor(
        @InjectModel(User.name)
        readonly userModel: Model<UserDocument, object, UserMethods>,
        @InjectModel(PasswordResetToken.name)
        private readonly passwordResetTokenModel: Model<PasswordResetTokenDocument>,
        @InjectModel(PasswordResetAttempt.name)
        private readonly passwordResetAttemptModel: Model<PasswordResetAttemptDocument>,
        private readonly jwtService: JwtService,
        private readonly mailService: MailService,
        private readonly configService: ConfigService<Config, true>,
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

        const code = await user.generateNonce();

        try {
            await this.mailService.sendVerificationCode(user.email.value, code);
        } catch (error) {
            // Sending failed — remove the half-created account so the user can
            // simply retry signup instead of being stuck on a "ghost" account
            // that never got a code.
            await this.userModel.findByIdAndDelete(user._id);
            this.logger.error('Failed to send verification email during signup', error);
            throw new BadRequestException({
                message: 'Failed to send verification email. Please try signing up again.',
            });
        }

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

        if (!user.email.verified) throw new EmailNotVerifiedException();

        const token = await this.jwtService.signAsync({
            sub: user.id,
            typ: 'user',
        });

        return { message: 'User login successful!', data: { user, token } };
    }

    async verifyEmail(userId: Identifier, code: string) {
        // `verification.*` fields are select:false — must explicitly re-select
        // them here or they will come back undefined and look "expired".
        const user = await this.userModel
            .findById(userId)
            .select('+verification.codeHash +verification.expiresAt +verification.attempts')
            .exec();

        if (!user) throw new UserNotFoundException();

        if (user.email.verified) {
            return { message: 'Email already verified', data: { user } };
        }

        const result = await user.verifyNonce(code);
        if (result !== true) throw new InvalidVerificationCodeException();

        user.email.verified = true;
        user.set('verification', undefined);
        await user.save();

        return { message: 'Email verified', data: { user } };
    }

    async resendVerificationCode(userId: Identifier) {
        const user = await this.userModel
            .findById(userId)
            .select('+verification.lastSentAt')
            .exec();

        if (!user) throw new UserNotFoundException();

        if (user.email.verified) {
            return { message: 'Email already verified' };
        }

        const lastSentAt = user.verification?.lastSentAt;
        if (
            lastSentAt &&
            Date.now() - lastSentAt.getTime() < VERIFICATION_RESEND_COOLDOWN_MS
        ) {
            throw new VerificationCodeRateLimitedException();
        }

        const code = await user.generateNonce();
        await this.mailService.sendVerificationCode(user.email.value, code);

        return { message: 'Verification code sent' };
    }

    async forgotPassword(dto: ForgotPasswordDto, ip: string) {
        const email = dto.email.trim().toLowerCase();

        // Log this attempt first — even for emails that don't exist — so both
        // per-IP and per-email rate limits can be enforced without ever
        // revealing whether the account exists via a different response shape.
        await this.passwordResetAttemptModel.create({ ip, email });

        const since = new Date(Date.now() - PASSWORD_RESET_RATE_LIMIT_WINDOW_MS);
        const [ipAttempts, emailAttempts] = await Promise.all([
            this.passwordResetAttemptModel.countDocuments({ ip, createdAt: { $gte: since } }),
            this.passwordResetAttemptModel.countDocuments({ email, createdAt: { $gte: since } }),
        ]);

        if (
            ipAttempts > PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS ||
            emailAttempts > PASSWORD_RESET_RATE_LIMIT_MAX_ATTEMPTS
        ) {
            return { message: GENERIC_FORGOT_PASSWORD_MESSAGE };
        }

        const user = await this.userModel.findOne({ 'email.value': email }).exec();

        if (user) {
            // Invalidate any previous unused tokens before issuing a new one.
            await this.passwordResetTokenModel.updateMany(
                { userId: user._id, used: false },
                { $set: { used: true } },
            );

            const rawToken = crypto.randomBytes(32).toString('hex');
            await this.passwordResetTokenModel.create({
                userId: user._id,
                tokenHash: hashToken(rawToken),
                expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
                used: false,
            });

            const frontendUrl = this.configService.get('frontendUrl', { infer: true });
            const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

            try {
                await this.mailService.sendPasswordResetLink(user.email.value, resetUrl);
            } catch (error) {
                this.logger.error('Failed to send password reset email', error);
            }
        }

        return { message: GENERIC_FORGOT_PASSWORD_MESSAGE };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const tokenHash = hashToken(dto.token);

        const resetToken = await this.passwordResetTokenModel.findOne({
            tokenHash,
            used: false,
            expiresAt: { $gt: new Date() },
        });

        if (!resetToken) throw new InvalidResetTokenException();

        const user = await this.userModel.findById(resetToken.userId).exec();
        if (!user) throw new InvalidResetTokenException();

        user.set('password', dto.password);
        await user.save();

        await this.passwordResetTokenModel.updateMany(
            { userId: user._id, used: false },
            { $set: { used: true } },
        );

        return { message: 'Password updated successfully.' };
    }
}
