import { Transform } from "class-transformer";
import { CreateProductDto } from "./create-product.dto";
import { File as MulterFile } from "multer";

export class ProductPayloadDto {
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error("Invalid JSON format");
    }
  })
  data: CreateProductDto;

  file: MulterFile;
}
