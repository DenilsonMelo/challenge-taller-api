import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PrismaService } from "src/shared/prisma/prisma.service";

@Injectable()
export class ProductService {
  constructor(private readonly prismaService: PrismaService) {}
  create(createProductDto: CreateProductDto) {
    return this.prismaService.product.create({
      data: createProductDto
    });
  }

  findAll() {
    return this.prismaService.product.findMany();
  }

  async findOne(id: string) {
    const product = await this.prismaService.product.findUnique({
      where: { id }
    });

    if (!product) {
      throw new NotFoundException("Produto não encontrado");
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.prismaService.product.findUnique({
      where: { id }
    });

    if (!product) {
      throw new NotFoundException("Produto não encontrado");
    }

    return this.prismaService.product.update({
      where: { id },
      data: updateProductDto
    });
  }

  remove(id: string) {
    return this.prismaService.product.delete({
      where: { id }
    });
  }
}
