import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { preSave, preValidate } from './schemas/middleware';
import { userMethods } from './schemas/methods';
import { PasswordResetToken, PasswordResetTokenSchema } from './schemas/password-reset-token.schema';
import { PasswordResetAttempt, PasswordResetAttemptSchema } from './schemas/password-reset-attempt.schema';
import { UsersController } from './users.controller';
import { AuthController } from './auth.controller';
import { MulterModule } from '@nestjs/platform-express';
import { TMP_DIR } from 'src/config';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    MulterModule.register({
      dest: TMP_DIR,
      limits: { fileSize: 25 * 1_000_000, files: 5 },
    }),
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        useFactory() {
          const schema = UserSchema;

          for (const method of userMethods) schema.method(method.name, method);

          schema.virtual('fullName').get(function () {
            return `${this.name.first ?? ''} ${this.name.last ?? ''}`.trim();
          });

          schema.pre('save', preSave);
          schema.pre('validate', preValidate);

          return schema;
        },
      },
    ]),
    MongooseModule.forFeature([
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      { name: PasswordResetAttempt.name, schema: PasswordResetAttemptSchema },
    ]),
    MailModule,
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController, AuthController],
})
export class UsersModule {}