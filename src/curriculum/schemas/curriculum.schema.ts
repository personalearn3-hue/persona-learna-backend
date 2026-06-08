import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as Mschema, Types } from 'mongoose';
import { UserDocument } from 'src/users/schemas/user.schema';

export type CurriculumDocument = HydratedDocument<Curriculum>;

@Schema({ _id: false })
export class CurriculumMetadata {
  @Prop({ type: String })
  institutionName?: string;

  @Prop({ type: String })
  tutorName?: string;

  @Prop({ type: String })
  dateCreated?: string;

  @Prop({ type: String })
  professorContact?: string;

  @Prop({ type: String })
  courseRequirements?: string;

  @Prop({ type: String })
  technologyRequirements?: string;

  @Prop({ type: String })
  preliminaryInfo?: string;
}

@Schema({ _id: true })
export class Curriculum {
  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String })
  pdfUrl?: string;

  @Prop({ type: String })
  extractedText?: string;

   @Prop({ type: Mschema.Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId | UserDocument;

  @Prop({ type: CurriculumMetadata })
  metadata?: CurriculumMetadata;

  @Prop({ type: Boolean, default: true })
  isPublished: boolean;

  @Prop({ type: Date })
  uploadedAt?: Date;
}

export const CurriculumSchema = SchemaFactory.createForClass(Curriculum)

