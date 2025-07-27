import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException
} from "@nestjs/common";
import { ProductService } from "./product.service";
import { AdminGuard } from "../auth/guards/admin.guard";
import { Public } from "../auth/decorators/public.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { MulterFile } from "multer";
import { ProductPayloadDto } from "./dto/product.payload.dto";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { CreateProductDto } from "./dto/create-product.dto";

@Controller("product")
@ApiTags("Product")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseInterceptors(FileInterceptor("imageFile"))
  @UseGuards(AdminGuard)
  @ApiCreatedResponse({ type: ProductPayloadDto })
  create(
    @UploadedFile() imageFile: MulterFile,
    @Body() createProductDto: ProductPayloadDto
  ) {
    if (!imageFile) {
      throw new BadRequestException("Imagem não enviada");
    }

    return this.productService.create(createProductDto.data, imageFile);
  }

  @Get()
  @Public()
  @ApiOkResponse({ type: CreateProductDto, isArray: true })
  findAll() {
    return this.productService.findAll();
  }

  @Get(":id")
  @Public()
  @ApiOkResponse({ type: CreateProductDto })
  findOne(@Param("id") id: string) {
    return this.productService.findOne(id);
  }

  @Patch(":id")
  @UseInterceptors(FileInterceptor("imageFile"))
  @UseGuards(AdminGuard)
  @ApiOkResponse({ type: ProductPayloadDto })
  update(
    @Param("id") id: string,
    @Body() updateProductDto: ProductPayloadDto,
    @UploadedFile() imageFile: MulterFile
  ) {
    let productData;
    try {
      productData =
        typeof updateProductDto.data === "string"
          ? JSON.parse(updateProductDto.data)
          : updateProductDto.data;
    } catch (error) {
      throw new BadRequestException("Dados do produto inválidos");
    }
    return this.productService.update(id, productData, imageFile);
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  @ApiOkResponse({ type: CreateProductDto })
  remove(@Param("id") id: string) {
    return this.productService.remove(id);
  }
}
