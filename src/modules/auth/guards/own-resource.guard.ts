import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException
} from "@nestjs/common";
import { UserType } from "@prisma/client";
import {
  AuthenticatedRequest,
  AuthenticatedUser
} from "../interfaces/authenticated-user.interface";
import { PrismaService } from "src/shared/prisma/prisma.service";

@Injectable()
export class OwnResourceGuard implements CanActivate {
  constructor(private readonly prismaService: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user as AuthenticatedUser;
    const params = request.params;
    const body = request.body;
    const url = request.url;

    if (!user) {
      throw new ForbiddenException("Usuário não autenticado");
    }

    if (user.userType === UserType.ADMIN) {
      return true;
    }

    if (user.userType === UserType.CLIENT) {
      return await this.validateClientAccess(user, params, body, url);
    }

    return false;
  }

  private async validateClientAccess(
    user: AuthenticatedUser,
    params: any,
    body: any,
    url: string
  ): Promise<boolean> {
    try {
      if (url.includes("/cart-item")) {
        return await this.validateCartItemAccess(user, params, body);
      }

      if (url.includes("/cart")) {
        return await this.validateCartAccess(user, params, body);
      }

      if (url.includes("/order")) {
        return await this.validateOrderAccess(user, params, body);
      }

      return false;
    } catch (error) {
      throw new ForbiddenException("Acesso negado");
    }
  }

  private async validateCartAccess(
    user: AuthenticatedUser,
    params: any,
    body: any
  ): Promise<boolean> {
    if (body?.clientId && body.clientId !== user.id) {
      throw new ForbiddenException("Você só pode criar carrinho para si mesmo");
    }

    if (params?.id) {
      const cart = await this.prismaService.cart.findUnique({
        where: { id: params.id }
      });

      if (!cart) {
        throw new BadRequestException("Carrinho não encontrado");
      }

      if (cart.clientId !== user.id) {
        throw new ForbiddenException(
          "Você só pode acessar seus próprios carrinhos"
        );
      }
    }

    return true;
  }

  private async validateCartItemAccess(
    user: AuthenticatedUser,
    params: any,
    body: any
  ): Promise<boolean> {
    if (body?.cartId) {
      const cart = await this.prismaService.cart.findUnique({
        where: { id: body.cartId }
      });

      if (!cart) {
        throw new BadRequestException("Carrinho não encontrado");
      }

      if (cart.clientId !== user.id) {
        throw new ForbiddenException(
          "Você só pode adicionar itens aos seus próprios carrinhos"
        );
      }
    }

    if (params?.id) {
      const cartItem = await this.prismaService.cartItem.findUnique({
        where: { id: params.id },
        include: { cart: true }
      });

      if (!cartItem) {
        throw new BadRequestException("Item do carrinho não encontrado");
      }

      if (cartItem.cart.clientId !== user.id) {
        throw new ForbiddenException(
          "Você só pode acessar itens dos seus próprios carrinhos"
        );
      }
    }

    return true;
  }

  private async validateOrderAccess(
    user: AuthenticatedUser,
    params: any,
    body: any
  ): Promise<boolean> {
    if (body?.cartId) {
      const cart = await this.prismaService.cart.findUnique({
        where: { id: body.cartId }
      });

      if (!cart) {
        throw new BadRequestException("Carrinho não encontrado");
      }

      if (cart.clientId !== user.id) {
        throw new ForbiddenException(
          "Você só pode criar pedidos dos seus próprios carrinhos"
        );
      }
    }

    if (params?.id) {
      const order = await this.prismaService.order.findUnique({
        where: { id: params.id },
        include: { cart: true }
      });

      if (!order) {
        throw new BadRequestException("Pedido não encontrado");
      }

      if (order.cart.clientId !== user.id) {
        throw new ForbiddenException(
          "Você só pode acessar seus próprios pedidos"
        );
      }
    }

    return true;
  }
}
