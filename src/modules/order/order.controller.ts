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
import { OrderService } from "./order.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";
import { OwnResourceGuard } from "../auth/guards/own-resource.guard";
import { AdminGuard } from "../auth/guards/admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";

@Controller("order")
@ApiTags("Order")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(OwnResourceGuard)
  @ApiCreatedResponse({ type: CreateOrderDto })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOkResponse({ type: CreateOrderDto, isArray: true })
  findAll() {
    return this.orderService.findAll();
  }

  @Get("my-orders")
  @ApiOkResponse({ type: CreateOrderDto, isArray: true })
  findMyOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.orderService.findByUserId(user.id);
  }

  @Get(":id")
  @UseGuards(OwnResourceGuard)
  @ApiOkResponse({ type: CreateOrderDto })
  findOne(@Param("id") id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  @ApiOkResponse({ type: CreateOrderDto })
  update(@Param("id") id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(id, updateOrderDto);
  }

  @Delete(":id")
  @UseGuards(OwnResourceGuard)
  @ApiOkResponse({ type: CreateOrderDto })
  remove(@Param("id") id: string) {
    return this.orderService.remove(id);
  }
}
