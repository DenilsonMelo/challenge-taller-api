import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AdminGuard } from "./guards/admin.guard";
import { OwnResourceGuard } from "./guards/own-resource.guard";
import { ClientGuard } from "./guards/client.guard";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "24h" }
    })
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    JwtAuthGuard,
    AdminGuard,
    ClientGuard,
    OwnResourceGuard
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    AdminGuard,
    ClientGuard,
    OwnResourceGuard
  ]
})
export class AuthModule {}
