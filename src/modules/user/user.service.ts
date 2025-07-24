import { ConflictException, Injectable } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PrismaService } from "src/shared/prisma/prisma.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async create({ password, mail, ...createUserDto }: CreateUserDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { mail }
    });

    if (existingUser) {
      throw new ConflictException("Email já está em uso");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prismaService.user.create({
      data: {
        ...createUserDto,
        mail,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        mail: true,
        userType: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return user;
  }

  findAll() {
    return this.prismaService.user.findMany({
      select: {
        id: true,
        name: true,
        mail: true,
        userType: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  findOne(id: string) {
    return this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        mail: true,
        userType: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.prismaService.user.update({
      where: { id },
      data: updateUserDto
    });
  }

  remove(id: string) {
    return this.prismaService.user.delete({
      where: { id }
    });
  }
}
