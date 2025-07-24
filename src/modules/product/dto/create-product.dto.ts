import { IsString, IsNumber, IsUrl, IsInt, Min } from "class-validator";

export class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsUrl()
  imageUrl: string;

  @IsInt()
  @Min(0)
  stock: number;
}
