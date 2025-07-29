import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { PrismaService } from "src/shared/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { UnauthorizedException, ConflictException } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { UserType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

const mockLoginDto: LoginDto = {
  mail: "joao@email.com",
  password: "password123"
};

const mockRegisterDto: RegisterDto = {
  mail: "joao@email.com",
  password: "password123",
  name: "João Silva",
  userType: UserType.CLIENT
};

const mockUser = {
  id: "user1",
  mail: "joao@email.com",
  name: "João Silva",
  password: "hashedPassword123",
  userType: UserType.CLIENT,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z")
};

const mockUserWithoutPassword = {
  id: "user1",
  mail: "joao@email.com",
  name: "João Silva",
  userType: UserType.CLIENT,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z")
};

const mockJwtPayload = {
  id: "user1",
  mail: "joao@email.com",
  name: "João Silva",
  userType: UserType.CLIENT
};

const mockAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn()
  }
} as any;

const mockJwtService = {
  sign: jest.fn()
} as any;

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe("AuthService", () => {
  let service: AuthService;
  let prismaService: typeof mockPrismaService;
  let jwtService: typeof mockJwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);

    mockBcrypt.hash.mockClear();
    mockBcrypt.compare.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("validateUser", () => {
    it("deve retornar usuário quando credenciais são válidas", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser(
        "joao@email.com",
        "password123"
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { mail: "joao@email.com" }
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashedPassword123"
      );
      expect(result).toEqual(mockUser);
    });

    it("deve retornar null quando usuário não encontrado", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(
        "inexistente@email.com",
        "password123"
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { mail: "inexistente@email.com" }
      });
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("deve retornar null quando senha é inválida", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateUser(
        "joao@email.com",
        "senhaErrada"
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { mail: "joao@email.com" }
      });
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "senhaErrada",
        "hashedPassword123"
      );
      expect(result).toBeNull();
    });

    it("deve buscar usuário pelo email correto", async () => {
      const specificEmail = "usuario.especifico@email.com";
      const specificUser = { ...mockUser, mail: specificEmail };

      prismaService.user.findUnique.mockResolvedValue(specificUser);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser(specificEmail, "password123");

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { mail: specificEmail }
      });
      expect(result.mail).toBe(specificEmail);
    });

    it("deve comparar senhas corretamente", async () => {
      const specificPassword = "minhaSenh@123";

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);

      await service.validateUser("joao@email.com", specificPassword);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        specificPassword,
        "hashedPassword123"
      );
    });
  });

  describe("login", () => {
    it("deve fazer login com sucesso", async () => {
      jest.spyOn(service, "validateUser").mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue(mockAccessToken);

      const result = await service.login(mockLoginDto);

      expect(service.validateUser).toHaveBeenCalledWith(
        "joao@email.com",
        "password123"
      );
      expect(jwtService.sign).toHaveBeenCalledWith(mockJwtPayload);
      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: "user1",
          mail: "joao@email.com",
          name: "João Silva",
          userType: UserType.CLIENT
        }
      });
    });

    it("deve lançar UnauthorizedException quando credenciais são inválidas", async () => {
      jest.spyOn(service, "validateUser").mockResolvedValue(null);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        new UnauthorizedException("Credenciais inválidas")
      );

      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    it("deve retornar dados do usuário sem senha", async () => {
      jest.spyOn(service, "validateUser").mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue(mockAccessToken);

      const result = await service.login(mockLoginDto);

      expect(result.user).not.toHaveProperty("password");
      expect(result.user).toEqual({
        id: "user1",
        mail: "joao@email.com",
        name: "João Silva",
        userType: UserType.CLIENT
      });
    });
  });

  describe("register", () => {
    it("deve registrar usuário com sucesso", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue("hashedPassword123" as never);
      prismaService.user.create.mockResolvedValue(mockUserWithoutPassword);

      const result = await service.register(mockRegisterDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { mail: "joao@email.com" }
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          mail: "joao@email.com",
          password: "hashedPassword123",
          name: "João Silva",
          userType: UserType.CLIENT
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
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it("deve lançar ConflictException quando email já está em uso", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        new ConflictException("Email já está em uso")
      );

      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it("deve registrar usuário ADMIN", async () => {
      const adminRegisterDto: RegisterDto = {
        ...mockRegisterDto,
        userType: UserType.ADMIN
      };
      const adminUser = {
        ...mockUserWithoutPassword,
        userType: UserType.ADMIN
      };

      prismaService.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue("hashedPassword123" as never);
      prismaService.user.create.mockResolvedValue(adminUser);

      const result = await service.register(adminRegisterDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          mail: "joao@email.com",
          password: "hashedPassword123",
          name: "João Silva",
          userType: UserType.ADMIN
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
      expect(result.userType).toBe(UserType.ADMIN);
    });

    it("não deve retornar senha no resultado", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue("hashedPassword123" as never);
      prismaService.user.create.mockResolvedValue(mockUserWithoutPassword);

      const result = await service.register(mockRegisterDto);

      expect(result).not.toHaveProperty("password");
    });
  });

  describe("getProfile", () => {
    it("deve retornar perfil do usuário", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUserWithoutPassword);

      const result = await service.getProfile("user1");

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user1" },
        select: {
          id: true,
          mail: true,
          name: true,
          userType: true,
          createdAt: true,
          updatedAt: true
        }
      });
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it("deve retornar null quando usuário não encontrado", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getProfile("user999");

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user999" },
        select: expect.any(Object)
      });
      expect(result).toBeNull();
    });

    it("deve buscar usuário por ID específico", async () => {
      const specificUserId = "specific-user-id";
      const specificUser = { ...mockUserWithoutPassword, id: specificUserId };

      prismaService.user.findUnique.mockResolvedValue(specificUser);

      const result = await service.getProfile(specificUserId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: specificUserId },
        select: expect.any(Object)
      });
      expect(result.id).toBe(specificUserId);
    });

    it("não deve retornar senha no perfil", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUserWithoutPassword);

      const result = await service.getProfile("user1");

      expect(result).not.toHaveProperty("password");
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user1" },
        select: {
          id: true,
          mail: true,
          name: true,
          userType: true,
          createdAt: true,
          updatedAt: true
        }
      });
    });

    it("deve retornar perfil de usuário ADMIN", async () => {
      const adminUser = {
        ...mockUserWithoutPassword,
        userType: UserType.ADMIN
      };
      prismaService.user.findUnique.mockResolvedValue(adminUser);

      const result = await service.getProfile("user1");

      expect(result.userType).toBe(UserType.ADMIN);
    });
  });

  describe("validações de segurança", () => {
    it("deve verificar email antes de registrar", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(mockRegisterDto)).rejects.toThrow(
        new ConflictException("Email já está em uso")
      );
    });

    it("deve validar credenciais antes de fazer login", async () => {
      jest.spyOn(service, "validateUser").mockResolvedValue(null);

      await expect(service.login(mockLoginDto)).rejects.toThrow(
        new UnauthorizedException("Credenciais inválidas")
      );
    });

    it("deve comparar senha hash ao validar usuário", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true as never);

      await service.validateUser("joao@email.com", "password123");

      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        "password123",
        "hashedPassword123"
      );
    });

    it("nunca deve retornar senha em responses", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue("hashedPassword123" as never);
      prismaService.user.create.mockResolvedValue(mockUserWithoutPassword);

      const registerResult = await service.register(mockRegisterDto);
      expect(registerResult).not.toHaveProperty("password");

      jest.spyOn(service, "validateUser").mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue(mockAccessToken);

      const loginResult = await service.login(mockLoginDto);
      expect(loginResult.user).not.toHaveProperty("password");

      prismaService.user.findUnique.mockResolvedValue(mockUserWithoutPassword);

      const profileResult = await service.getProfile("user1");
      expect(profileResult).not.toHaveProperty("password");
    });
  });
});
