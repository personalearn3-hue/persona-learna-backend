import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PasswordResetAttemptDocument = HydratedDocument<PasswordResetAttempt>;

// Logs every /auth/forgot-password call (found or not) so we can rate-limit
// by IP and by email without ever revealing whether the email exists.
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class PasswordResetAttempt {
  @Prop({ type: String, required: true, index: true })
  ip: string;

  @Prop({ type: String, required: true, index: true })
  email: string;
}

export const PasswordResetAttemptSchema = SchemaFactory.createForClass(PasswordResetAttempt);
