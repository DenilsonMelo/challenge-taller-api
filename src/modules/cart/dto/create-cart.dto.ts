import { IsString, IsUUID } from "class-validator";

export class CreateCartDto {
  @IsString()
  @IsUUID()
  clientId: string;
}
