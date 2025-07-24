import { IsString, IsUUID, IsInt, Min } from "class-validator";

export class CreateCartItemDto {
  @IsString()
  @IsUUID()
  productId: string;

  @IsString()
  @IsUUID()
  cartId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  total: number;
}
