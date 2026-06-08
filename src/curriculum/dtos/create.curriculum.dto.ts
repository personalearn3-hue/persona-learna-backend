import { IsNotEmpty, IsString } from "class-validator";

export class CreateCurriculumDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    description: string;


}