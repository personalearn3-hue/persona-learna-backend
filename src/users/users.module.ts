import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { preSave, preValidate } from './schemas/middleware';
import { userMethods } from './schemas/methods';
import { UsersController } from './users.controller';
import { MulterModule } from '@nestjs/platform-express';
import { TMP_DIR } from 'src/config';

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
  ],
  providers: [UsersService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}