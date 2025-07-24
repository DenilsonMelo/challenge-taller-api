import { UserType } from "@prisma/client";
import { IsEmail, IsEnum, IsString } from "class-validator";

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  password: string;

  @IsString()
  @IsEmail()
  mail: string;

  @IsEnum(UserType)
  userType: UserType;
}
