import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsStrongPassword,
    Matches,
} from 'class-validator';
// import { EmailValidator, TitleValidator } from 'src/common/decorators';

import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';

export function TitleValidator() {
    return applyDecorators(
        Transform((params) => {
            let value: string = params.value;

            value = value.trim();

            return value[0].toUpperCase() + value.slice(1).toLowerCase();
        }),
        IsString(),
        IsNotEmpty(),
    );
}

import { IsEmail } from 'class-validator';
import { UserType } from '../schemas/user.schema';

export function EmailValidator() {
    return applyDecorators(
        Transform((params) => {
            const value: string = params.value;

            const [local, domain] = value.split('@');

            // replace possible dots in the local-part of the email as some email providers treat them the same as others without
            return `${local.replaceAll('.', '')}@${domain}`.toLowerCase();
        }),
        IsEmail(),
    );
}

/**
 * All fields are made optional by default.
 * Modify to suit the app's requirements.
 */
export class SignupDto {

    @TitleValidator()
    'name.first': string;

    @TitleValidator()
    'name.last': string;

    @IsString()
    @IsNotEmpty()
    email: string;

    @IsEnum(UserType)
    role: UserType

    @IsString()
    @IsNotEmpty()
    // @IsStrongPassword()
    password: string;

}