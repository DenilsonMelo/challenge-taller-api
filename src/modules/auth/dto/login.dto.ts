import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  mail: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  password: string;
}
