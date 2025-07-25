import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "../auth.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: "mail",
      passwordField: "password"
    });
  }

  async validate(mail: string, password: string) {
    const user = await this.authService.validateUser(mail, password);
    if (!user) {
      throw new UnauthorizedException("Credenciais inválidas");
    }
    return user;
  }
}
