import {
  Injectable,
  UnauthorizedException,
  ConflictException
} from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import * as bcrypt from "bcryptjs";
import { JwtPayload } from "./strategies/jwt.strategy";
import { PrismaService } from "src/shared/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async validateUser(mail: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { mail }
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.mail, loginDto.password);
    if (!user) {
      throw new UnauthorizedException("Credenciais inválidas");
    }

    const payload: JwtPayload = {
      id: user.id,
      mail: user.mail,
      name: user.name,
      userType: user.userType
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        mail: user.mail,
        name: user.name,
        userType: user.userType
      }
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { mail: registerDto.mail }
    });

    if (existingUser) {
      throw new ConflictException("Email já está em uso");
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...registerDto,
        password: hashedPassword
      },
      select: {
        id: true,
        mail: true,
        name: true,
        userType: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return user;
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mail: true,
        name: true,
        userType: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
}
