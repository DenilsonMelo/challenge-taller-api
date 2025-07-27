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
import { UserService } from "./user.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AdminGuard } from "../auth/guards/admin.guard";
import { Public } from "../auth/decorators/public.decorator";
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";

@Controller("user")
@ApiTags("User")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiCreatedResponse({ type: CreateUserDto })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Public()
  @ApiOkResponse({ type: CreateUserDto, isArray: true })
  findAll() {
    return this.userService.findAll();
  }

  @Get(":id")
  @Public()
  @ApiOkResponse({ type: CreateUserDto })
  findOne(@Param("id") id: string) {
    return this.userService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  @ApiOkResponse({ type: UpdateUserDto })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  @ApiOkResponse({ type: CreateUserDto })
  remove(@Param("id") id: string) {
    return this.userService.remove(id);
  }
}
