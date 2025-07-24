import { Module } from "@nestjs/common";
import { UserModule } from "./modules/user/user.module";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { ProductModule } from "./modules/product/product.module";
import { CartModule } from "./modules/cart/cart.module";
import { CartItemModule } from "./modules/cart-item/cart-item.module";
import { OrderModule } from "./modules/order/order.module";

@Module({
  imports: [
    UserModule,
    PrismaModule,
    ProductModule,
    CartModule,
    CartItemModule,
    OrderModule
  ]
})
export class AppModule {}
