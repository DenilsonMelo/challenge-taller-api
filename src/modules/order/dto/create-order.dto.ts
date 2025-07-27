import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID } from "class-validator";

export class CreateOrderDto {
  @IsString()
  @IsUUID()
  @ApiProperty()
  cartId: string;
}
