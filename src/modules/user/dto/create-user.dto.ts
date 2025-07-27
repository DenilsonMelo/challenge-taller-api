import { ApiProperty } from "@nestjs/swagger";
import { UserType } from "@prisma/client";
import { IsEmail, IsEnum, IsString } from "class-validator";

export class CreateUserDto {
  @IsString()
  @ApiProperty()
  name: string;

  @IsString()
  @ApiProperty()
  password: string;

  @IsString()
  @IsEmail()
  @ApiProperty()
  mail: string;

  @IsEnum(UserType)
  @ApiProperty({ enum: UserType })
  userType: UserType;
}
