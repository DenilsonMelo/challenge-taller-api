import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException
} from "@nestjs/common";
import { UserType } from "@prisma/client";
import {
  AuthenticatedRequest,
  AuthenticatedUser
} from "../interfaces/authenticated-user.interface";

@Injectable()
export class ClientGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException("Usuário não autenticado");
    }

    if (user.userType !== UserType.CLIENT) {
      throw new ForbiddenException(
        "Acesso negado. Apenas clientes podem acessar esta rota"
      );
    }

    return true;
  }
}
