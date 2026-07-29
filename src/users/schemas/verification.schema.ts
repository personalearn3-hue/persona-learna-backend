import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class Verification {
  @Prop({ type: String, select: false })
  codeHash?: string;

  @Prop({ type: Date, select: false })
  expiresAt?: Date;

  @Prop({ type: Number, default: 0, select: false })
  attempts: number;

  @Prop({ type: Date, select: false })
  lastSentAt?: Date;
}
