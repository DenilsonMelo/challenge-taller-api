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
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";

@Controller("cart")
@ApiTags("Cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @UseGuards(OwnResourceGuard)
  @ApiCreatedResponse({ type: CreateCartDto })
  create(
    @Body() createCartDto: CreateCartDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    createCartDto.clientId = user.id;
    return this.cartService.create(createCartDto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOkResponse({ type: CreateCartDto, isArray: true })
  findAll() {
    return this.cartService.findAll();
  }

  @Get("my-cart")
  @ApiOkResponse({ type: CreateCartDto })
  findMyCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.findByClientId(user.id);
  }

  @Get(":id")
  @UseGuards(OwnResourceGuard)
  @ApiOkResponse({ type: CreateCartDto })
  findOne(@Param("id") id: string) {
    return this.cartService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(OwnResourceGuard)
  @ApiOkResponse({ type: CreateCartDto })
  update(@Param("id") id: string, @Body() updateCartDto: UpdateCartDto) {
    return this.cartService.update(id, updateCartDto);
  }

  @Delete(":id")
  @UseGuards(OwnResourceGuard)
  @ApiOkResponse({ type: CreateCartDto })
  remove(@Param("id") id: string) {
    return this.cartService.remove(id);
  }
}
