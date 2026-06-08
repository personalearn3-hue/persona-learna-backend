import { Prop } from '@nestjs/mongoose';

export const FIRST_NAME_MAX_LENGTH = 50;
export const LAST_NAME_MAX_LENGTH = 50;

export class Name {
  @Prop({ type: String, trim: true, maxlength: FIRST_NAME_MAX_LENGTH })
  first: string;

  @Prop({ type: String, trim: true, maxlength: LAST_NAME_MAX_LENGTH })
  last: string;
}