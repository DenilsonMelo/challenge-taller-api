import { Module } from "@nestjs/common";
import { UserModule } from "./modules/user/user.module";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { ProductModule } from "./modules/product/product.module";
import { CartModule } from "./modules/cart/cart.module";

@Module({
  imports: [UserModule, PrismaModule, ProductModule, CartModule]
})
export class AppModule {}
