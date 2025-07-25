import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards
} from "@nestjs/common";
import { CartItemService } from "./cart-item.service";
import { CreateCartItemDto } from "./dto/create-cart-item.dto";
import { UpdateCartItemDto } from "./dto/update-cart-item.dto";
import { OwnResourceGuard } from "../auth/guards/own-resource.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";

@Controller("cart-item")
export class CartItemController {
  constructor(private readonly cartItemService: CartItemService) {}

  @Post()
  @UseGuards(OwnResourceGuard)
  create(@Body() createCartItemDto: CreateCartItemDto) {
    return this.cartItemService.create(createCartItemDto);
  }

  @Get()
  @UseGuards(AdminGuard)
  findAll() {
    return this.cartItemService.findAll();
  }

  @Get("my-cart-items")
  findMyCartItems(@CurrentUser() user: AuthenticatedUser) {
    return this.cartItemService.findByUserId(user.id);
  }

  @Get(":id")
  @UseGuards(OwnResourceGuard)
  findOne(@Param("id") id: string) {
    return this.cartItemService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(OwnResourceGuard)
  update(
    @Param("id") id: string,
    @Body() updateCartItemDto: UpdateCartItemDto
  ) {
    return this.cartItemService.update(id, updateCartItemDto);
  }

  @Delete(":id")
  @UseGuards(OwnResourceGuard)
  remove(@Param("id") id: string) {
    return this.cartItemService.remove(id);
  }
}
