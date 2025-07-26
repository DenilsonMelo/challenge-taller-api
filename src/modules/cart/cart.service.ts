import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException
} from "@nestjs/common";
import { CreateCartDto } from "./dto/create-cart.dto";
import { UpdateCartDto } from "./dto/update-cart.dto";
import { PrismaService } from "src/shared/prisma/prisma.service";

@Injectable()
export class CartService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCartDto: CreateCartDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: createCartDto.clientId }
    });

    if (!user) {
      throw new BadRequestException("Usuário não encontrado");
    }

    const existingCart = await this.prismaService.cart.findFirst({
      where: { clientId: createCartDto.clientId, order: null }
    });

    if (existingCart) {
      throw new ConflictException("Usuário já possui um carrinho ativo");
    }

    return this.prismaService.cart.create({
      data: {
        clientId: createCartDto.clientId,
        total: 0
      },
      include: {
        cartItems: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            mail: true
          }
        }
      }
    });
  }

  async findAll() {
    return this.prismaService.cart.findMany({
      include: {
        cartItems: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            mail: true
          }
        }
      }
    });
  }

  async findByClientId(clientId: string) {
    return this.prismaService.cart.findFirst({
      where: { clientId, order: null },
      include: {
        cartItems: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            mail: true
          }
        }
      }
    });
  }

  async findOne(id: string) {
    const cart = await this.prismaService.cart.findUnique({
      where: { id },
      include: {
        cartItems: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            mail: true
          }
        }
      }
    });

    if (!cart) {
      throw new NotFoundException("Carrinho não encontrado");
    }

    return cart;
  }

  async update(id: string, updateCartDto: UpdateCartDto) {
    await this.findOne(id);

    return this.prismaService.cart.update({
      where: { id },
      data: updateCartDto,
      include: {
        cartItems: {
          include: {
            product: true
          }
        }
      }
    });
  }

  async remove(id: string) {
    const order = await this.prismaService.order.findUnique({
      where: { cartId: id }
    });

    if (order) {
      throw new ConflictException(
        "Não é possível remover carrinho que já foi convertido em pedido"
      );
    }

    return this.prismaService.cart.delete({
      where: { id }
    });
  }

  async calculateTotal(cartId: string): Promise<number> {
    const cartItems = await this.prismaService.cartItem.findMany({
      where: { cartId },
      include: { product: true }
    });

    return cartItems.reduce((total, item) => total + item.total, 0);
  }

  async updateTotal(cartId: string): Promise<void> {
    const total = await this.calculateTotal(cartId);

    await this.prismaService.cart.update({
      where: { id: cartId },
      data: { total }
    });
  }
}
