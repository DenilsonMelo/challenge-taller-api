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
import { CartService } from "./cart.service";
import { CreateCartDto } from "./dto/create-cart.dto";
import { UpdateCartDto } from "./dto/update-cart.dto";
import { OwnResourceGuard } from "../auth/guards/own-resource.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { AdminGuard } from "../auth/guards/admin.guard";

@Controller("cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @UseGuards(OwnResourceGuard)
  create(
    @Body() createCartDto: CreateCartDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    createCartDto.clientId = user.id;
    return this.cartService.create(createCartDto);
  }

  @Get()
  @UseGuards(AdminGuard)
  findAll() {
    return this.cartService.findAll();
  }

  @Get("my-cart")
  findMyCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.findByClientId(user.id);
  }

  @Get(":id")
  @UseGuards(OwnResourceGuard)
  findOne(@Param("id") id: string) {
    return this.cartService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(OwnResourceGuard)
  update(@Param("id") id: string, @Body() updateCartDto: UpdateCartDto) {
    return this.cartService.update(id, updateCartDto);
  }

  @Delete(":id")
  @UseGuards(OwnResourceGuard)
  remove(@Param("id") id: string) {
    return this.cartService.remove(id);
  }
}
