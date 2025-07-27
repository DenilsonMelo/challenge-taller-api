import { Module } from "@nestjs/common";
import { ProductService } from "./product.service";
import { ProductController } from "./product.controller";
import { S3Module } from "src/shared/s3/s3.module";

@Module({
  imports: [S3Module],
  controllers: [ProductController],
  providers: [ProductService]
})
export class ProductModule {}
