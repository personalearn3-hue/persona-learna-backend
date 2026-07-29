import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
import { Email } from "src/common/schemas/email.schema";
import { Name } from "src/common/schemas/name.schema";
import { Verification } from "./verification.schema";

export type UserDocument = HydratedDocument<User>;

export enum UserType {
    ADMIN = 'admin',
    STUDENT = 'student',
    TEACHER = 'teacher',
    CREATOR = 'creator',
}

@Schema({ timestamps: true })
export class User {
    @Prop({ enum: UserType, required: true })
    role: UserType;

    @Prop({ type: Name })
    name: Name;

    @Prop({ type: Email, required: true })
    email: Email;

    @Prop({ type: Boolean, default: false })
    isOnHold: boolean;

    @Prop({ type: Number, default: 0 })
    curriculaEnrolled: number;

    @Prop({ type: Number, default: 0 })
    curriculaCreated: number;

    @Prop({ type: Number, default: 0 })
    totalLearningTime: number; // in minutes

    @Prop({ type: Date })
    lastLogin: Date;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: Verification, default: () => ({}) })
    verification: Verification;
}


export const UserSchema = SchemaFactory.createForClass(User);

// Ensures password hash and the verification code/expiry/attempts never
// reach a client response, regardless of how the document was fetched.
UserSchema.set('toJSON', {
    transform: (_doc, ret: any) => {
        const { password, verification, __v, ...safe } = ret;
        return safe;
    },
});