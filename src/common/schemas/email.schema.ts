import { Prop, Schema } from '@nestjs/mongoose';
import { isEmail } from 'class-validator';

@Schema({ _id: false })
export class Email {
  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    validate: { validator: (v: string) => isEmail(v) },
  })
  value: string;

  @Prop({ type: Boolean, default: false })
  verified: boolean;
}