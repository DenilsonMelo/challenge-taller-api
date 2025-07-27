import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID } from "class-validator";

export class CreateCartDto {
  @IsString()
  @IsUUID()
  @ApiProperty()
  clientId: string;
}
