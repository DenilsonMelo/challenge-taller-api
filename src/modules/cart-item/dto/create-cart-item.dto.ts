import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID, IsInt, Min } from "class-validator";

export class CreateCartItemDto {
  @IsString()
  @IsUUID()
  @ApiProperty()
  productId: string;

  @IsString()
  @IsUUID()
  @ApiProperty()
  cartId: string;

  @IsInt()
  @Min(1)
  @ApiProperty({ minimum: 1 })
  quantity: number;

  @IsInt()
  @ApiProperty()
  total: number;
}
