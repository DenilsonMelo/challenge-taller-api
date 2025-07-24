import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException
} from "@nestjs/common";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { PrismaService } from "src/shared/prisma/prisma.service";

@Injectable()
export class OrderService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const cart = await this.prismaService.cart.findUnique({
      where: { id: createOrderDto.cartId },
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

    if (cart.cartItems.length === 0) {
      throw new BadRequestException(
        "Não é possível criar pedido com carrinho vazio"
      );
    }

    const existingOrder = await this.prismaService.order.findUnique({
      where: { cartId: createOrderDto.cartId }
    });

    if (existingOrder) {
      throw new ConflictException("Já existe um pedido para este carrinho");
    }

    for (const cartItem of cart.cartItems) {
      if (cartItem.product.stock < cartItem.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente para o produto: ${cartItem.product.name}. 
          Disponível: ${cartItem.product.stock}, Solicitado: ${cartItem.quantity}`
        );
      }
    }

    const order = await this.prismaService.$transaction(async (prisma) => {
      const newOrder = await prisma.order.create({
        data: {
          cartId: createOrderDto.cartId
        },
        include: {
          cart: {
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
          }
        }
      });

      for (const cartItem of cart.cartItems) {
        await prisma.product.update({
          where: { id: cartItem.productId },
          data: {
            stock: {
              decrement: cartItem.quantity
            }
          }
        });
      }

      return newOrder;
    });

    return order;
  }

  async findAll() {
    return this.prismaService.order.findMany({
      include: {
        cart: {
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
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async findOne(id: string) {
    const order = await this.prismaService.order.findUnique({
      where: { id },
      include: {
        cart: {
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
        }
      }
    });

    if (!order) {
      throw new NotFoundException("Pedido não encontrado");
    }

    return order;
  }

  async findByUserId(userId: string) {
    return this.prismaService.order.findMany({
      where: {
        cart: {
          clientId: userId
        }
      },
      include: {
        cart: {
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
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    if (updateOrderDto.cartId) {
      const cart = await this.prismaService.cart.findUnique({
        where: { id: updateOrderDto.cartId }
      });

      if (!cart) {
        throw new NotFoundException("Carrinho não encontrado");
      }

      const existingOrder = await this.prismaService.order.findUnique({
        where: { cartId: updateOrderDto.cartId }
      });

      if (existingOrder && existingOrder.id !== id) {
        throw new ConflictException("Já existe um pedido para este carrinho");
      }
    }

    return this.prismaService.order.update({
      where: { id },
      data: updateOrderDto,
      include: {
        cart: {
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
        }
      }
    });
  }

  async remove(id: string) {
    const order = await this.findOne(id);

    await this.prismaService.$transaction(async (prisma) => {
      for (const cartItem of order.cart.cartItems) {
        await prisma.product.update({
          where: { id: cartItem.productId },
          data: {
            stock: {
              increment: cartItem.quantity
            }
          }
        });
      }

      await prisma.order.delete({
        where: { id }
      });
    });

    return { message: "Pedido cancelado e estoque restaurado com sucesso" };
  }

  async getOrderSummary() {
    const totalOrders = await this.prismaService.order.count();
    const orders = await this.prismaService.order.findMany({
      include: {
        cart: true
      }
    });

    const totalRevenue = orders.reduce((sum, order) => {
      return sum + (order.cart?.total || 0);
    }, 0);

    return {
      totalOrders,
      totalRevenue
    };
  }
}
