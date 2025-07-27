import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PrismaService } from "src/shared/prisma/prisma.service";
import { MulterFile } from "multer";
import { S3Service } from "src/shared/s3/s3.service";

@Injectable()
export class ProductService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly s3Service: S3Service
  ) {}
  async create(createProductDto: CreateProductDto, imageFile: MulterFile) {
    const imageUrl = await this.s3Service.uploadImage(imageFile, "products");

    return this.prismaService.product.create({
      data: { ...createProductDto, imageUrl }
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

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    imageFile?: MulterFile
  ) {
    const product = await this.prismaService.product.findUnique({
      where: { id }
    });

    if (!product) {
      throw new NotFoundException("Produto não encontrado");
    }

    const updateData = { ...updateProductDto };

    if (imageFile) {
      const newImageUrl = await this.s3Service.uploadImage(
        imageFile,
        "products"
      );
      updateData.imageUrl = newImageUrl;
    }

    return this.prismaService.product.update({
      where: { id },
      data: updateData
    });
  }

  async remove(id: string) {
    const product = await this.prismaService.product.findUnique({
      where: { id }
    });

    if (!product) {
      throw new NotFoundException("Produto não encontrado");
    }

    const ordersWithProduct = await this.prismaService.cartItem.count({
      where: {
        productId: id,
        cart: {
          order: {
            isNot: null
          }
        }
      }
    });

    if (ordersWithProduct > 0) {
      throw new ConflictException(
        "Não é possível excluir este produto pois ele está presente em pedidos existentes"
      );
    }

    try {
      const result = await this.prismaService.$transaction(async (prisma) => {
        await prisma.cartItem.deleteMany({
          where: {
            productId: id,
            cart: {
              order: null
            }
          }
        });

        const affectedCarts = await prisma.cart.findMany({
          where: {
            cartItems: {
              some: {
                productId: id
              }
            },
            order: null
          },
          include: {
            cartItems: true
          }
        });

        for (const cart of affectedCarts) {
          const newTotal = cart.cartItems
            .filter((item) => item.productId !== id)
            .reduce((sum, item) => sum + item.total, 0);

          await prisma.cart.update({
            where: { id: cart.id },
            data: { total: newTotal }
          });
        }

        return prisma.product.delete({
          where: { id }
        });
      });

      return result;
    } catch (error) {
      throw new ConflictException("Erro ao deletar produto");
    }
  }
}
