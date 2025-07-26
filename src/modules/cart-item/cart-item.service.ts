import {
  Injectable,
  NotFoundException,
  BadRequestException
} from "@nestjs/common";
import { CreateCartItemDto } from "./dto/create-cart-item.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { PrismaService } from "src/shared/prisma/prisma.service";

@Injectable()
export class CartItemService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createCartItemDto: CreateCartItemDto) {
    const product = await this.prismaService.product.findUnique({
      where: { id: createCartItemDto.productId }
    });

    if (!product) {
      throw new NotFoundException("Produto não encontrado");
    }

    const cart = await this.prismaService.cart.findUnique({
      where: { id: createCartItemDto.cartId }
    });

    if (!cart) {
      throw new NotFoundException("Carrinho não encontrado");
    }

    if (product.stock < createCartItemDto.quantity) {
      throw new BadRequestException("Estoque insuficiente");
    }

    const existingCartItem = await this.prismaService.cartItem.findFirst({
      where: {
        productId: createCartItemDto.productId,
        cartId: createCartItemDto.cartId
      }
    });

    if (existingCartItem) {
      const newQuantity =
        existingCartItem.quantity + createCartItemDto.quantity;

      if (product.stock < newQuantity) {
        throw new BadRequestException(
          "Estoque insuficiente para a quantidade total"
        );
      }

      return this.update(existingCartItem.id, { quantity: newQuantity });
    }

    const total = product.price * createCartItemDto.quantity;

    const cartItem = await this.prismaService.cartItem.create({
      data: {
        productId: createCartItemDto.productId,
        cartId: createCartItemDto.cartId,
        quantity: createCartItemDto.quantity,
        total
      },
      include: {
        product: true,
        cart: true
      }
    });

    await this.updateCartTotal(createCartItemDto.cartId);

    return cartItem;
  }

  async findAll() {
    return this.prismaService.cartItem.findMany({
      include: {
        product: true,
        cart: {
          include: {
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

  async findByUserId(userId: string) {
    return this.prismaService.cartItem.findMany({
      where: {
        cart: {
          clientId: userId,
          order: null
        }
      },
      include: {
        product: true,
        cart: true
      }
    });
  }

  async findOne(id: string) {
    const cartItem = await this.prismaService.cartItem.findUnique({
      where: { id },
      include: {
        product: true,
        cart: true
      }
    });

    if (!cartItem) {
      throw new NotFoundException("Item do carrinho não encontrado");
    }

    return cartItem;
  }

  async findByCartId(cartId: string) {
    return this.prismaService.cartItem.findMany({
      where: { cartId },
      include: {
        product: true
      }
    });
  }

  async update(id: string, updateCartItemDto: UpdateCartItemDto) {
    const cartItem = await this.findOne(id);

    if (updateCartItemDto.quantity !== undefined) {
      const product = await this.prismaService.product.findUnique({
        where: { id: cartItem.productId }
      });

      if (updateCartItemDto.quantity <= 0) {
        throw new BadRequestException("Quantidade deve ser maior que zero");
      }

      if (product.stock < updateCartItemDto.quantity) {
        throw new BadRequestException("Estoque insuficiente");
      }

      const newTotal = product.price * updateCartItemDto.quantity;
      updateCartItemDto.total = newTotal;
    }

    const updatedCartItem = await this.prismaService.cartItem.update({
      where: { id },
      data: updateCartItemDto,
      include: {
        product: true,
        cart: true
      }
    });

    await this.updateCartTotal(cartItem.cartId);

    return updatedCartItem;
  }

  async remove(id: string) {
    const cartItem = await this.findOne(id);

    await this.prismaService.cartItem.delete({
      where: { id }
    });

    await this.updateCartTotal(cartItem.cartId);

    return { message: "Item removido do carrinho com sucesso" };
  }

  async removeAllFromCart(cartId: string) {
    await this.prismaService.cartItem.deleteMany({
      where: { cartId }
    });

    await this.prismaService.cart.update({
      where: { id: cartId },
      data: { total: 0 }
    });

    return { message: "Todos os itens foram removidos do carrinho" };
  }

  private async updateCartTotal(cartId: string): Promise<void> {
    const cartItems = await this.prismaService.cartItem.findMany({
      where: { cartId },
      include: { product: true }
    });

    const total = cartItems.reduce((sum, item) => sum + item.total, 0);

    await this.prismaService.cart.update({
      where: { id: cartId },
      data: { total }
    });
  }
}
