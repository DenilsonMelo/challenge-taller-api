import { Transform } from "class-transformer";
import { CreateProductDto } from "./create-product.dto";
import { File as MulterFile } from "multer";
import { ApiProperty } from "@nestjs/swagger";

export class ProductPayloadDto {
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error("Invalid JSON format");
    }
  })
  @ApiProperty()
  data: CreateProductDto;

  @ApiProperty({ type: "string", format: "binary" })
  file: MulterFile;
}
