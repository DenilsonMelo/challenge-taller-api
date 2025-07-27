import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, IsInt, Min, IsOptional } from "class-validator";

export class CreateProductDto {
  @IsString()
  @ApiProperty()
  name: string;

  @IsNumber()
  @Min(0)
  @ApiProperty()
  price: number;

  @IsString()
  @IsOptional()
  @ApiProperty()
  imageUrl?: string;

  @IsInt()
  @Min(1)
  @ApiProperty()
  stock: number;
}
