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
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";

@Controller("cart-item")
@ApiTags("Cart Item")
export class CartItemController {
  constructor(private readonly cartItemService: CartItemService) {}

  @Post()
  @UseGuards(OwnResourceGuard)
  @ApiCreatedResponse({ type: CreateCartItemDto })
  create(@Body() createCartItemDto: CreateCartItemDto) {
    return this.cartItemService.create(createCartItemDto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOkResponse({ type: CreateCartItemDto, isArray: true })
  findAll() {
    return this.cartItemService.findAll();
  }

  @Get("my-cart-items")
  @ApiOkResponse({ type: CreateCartItemDto, isArray: true })
  findMyCartItems(@CurrentUser() user: AuthenticatedUser) {
    return this.cartItemService.findByUserId(user.id);
  }

  @Get(":id")
  @UseGuards(OwnResourceGuard)
  @ApiOkResponse({ type: CreateCartItemDto })
  findOne(@Param("id") id: string) {
    return this.cartItemService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(OwnResourceGuard)
  @ApiOkResponse({ type: CreateCartItemDto })
  update(
    @Param("id") id: string,
    @Body() updateCartItemDto: UpdateCartItemDto
  ) {
    return this.cartItemService.update(id, updateCartItemDto);
  }

  @Delete(":id")
  @UseGuards(OwnResourceGuard)
  @ApiOkResponse({ type: CreateCartItemDto })
  remove(@Param("id") id: string) {
    return this.cartItemService.remove(id);
  }
}
