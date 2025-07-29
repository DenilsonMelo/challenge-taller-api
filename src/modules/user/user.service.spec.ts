import { Test, TestingModule } from "@nestjs/testing";
import { UserService } from "./user.service";
import { PrismaService } from "src/shared/prisma/prisma.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserType } from "@prisma/client";

jest.mock("bcrypt", () => ({
  hash: jest.fn()
}));

import * as bcrypt from "bcrypt";

const mockCreateUserDto: CreateUserDto = {
  name: "João Silva",
  password: "password123",
  mail: "joao@email.com",
  userType: UserType.CLIENT
};

const mockUpdateUserDto: UpdateUserDto = {
  name: "João Silva Atualizado",
  mail: "joao.novo@email.com"
};

const mockUser = {
  id: "user1",
  name: "João Silva",
  mail: "joao@email.com",
  userType: UserType.CLIENT,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z")
};

const mockUserWithPassword = {
  ...mockUser,
  password: "hashedPassword123"
};

const mockUsers = [
  mockUser,
  {
    id: "user2",
    name: "Maria Santos",
    mail: "maria@email.com",
    userType: UserType.ADMIN,
    createdAt: new Date("2024-01-02T00:00:00.000Z"),
    updatedAt: new Date("2024-01-02T00:00:00.000Z")
  }
];

const mockPrismaService = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
} as any;

describe("UserService", () => {
  let service: UserService;
  let prismaService: typeof mockPrismaService;
  let mockBcryptHash: jest.MockedFunction<typeof bcrypt.hash>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get(PrismaService);

    mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
    mockBcryptHash.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("deve criar um usuário com sucesso", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      mockBcryptHash.mockResolvedValue("hashedPassword123" as never);
      prismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.create(mockCreateUserDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { mail: "joao@email.com" }
      });
      expect(mockBcryptHash).toHaveBeenCalledWith("password123", 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: "João Silva",
          mail: "joao@email.com",
          userType: UserType.CLIENT,
          password: "hashedPassword123"
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
      expect(result).toEqual(mockUser);
    });

    it("deve lançar ConflictException quando email já está em uso", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUserWithPassword);

      await expect(service.create(mockCreateUserDto)).rejects.toThrow(
        new ConflictException("Email já está em uso")
      );

      expect(mockBcryptHash).not.toHaveBeenCalled();
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it("deve criar usuário ADMIN", async () => {
      const adminUserDto: CreateUserDto = {
        ...mockCreateUserDto,
        userType: UserType.ADMIN
      };
      const adminUser = { ...mockUser, userType: UserType.ADMIN };

      prismaService.user.findUnique.mockResolvedValue(null);
      mockBcryptHash.mockResolvedValue("hashedPassword123" as never);
      prismaService.user.create.mockResolvedValue(adminUser);

      const result = await service.create(adminUserDto);

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: "João Silva",
          mail: "joao@email.com",
          userType: UserType.ADMIN,
          password: "hashedPassword123"
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
      expect(result.userType).toBe(UserType.ADMIN);
    });
  });

  describe("findAll", () => {
    it("deve retornar todos os usuários", async () => {
      prismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          mail: true,
          userType: true,
          createdAt: true,
          updatedAt: true
        }
      });
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it("deve retornar array vazio quando não há usuários", async () => {
      prismaService.user.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("findOne", () => {
    it("deve retornar um usuário quando encontrado", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne("user1");

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user1" },
        select: {
          id: true,
          name: true,
          mail: true,
          userType: true,
          createdAt: true,
          updatedAt: true
        }
      });
      expect(result).toEqual(mockUser);
    });

    it("deve lançar NotFoundException quando usuário não encontrado", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne("user999")).rejects.toThrow(
        new NotFoundException("Usuário não encontrado")
      );
    });

    it("deve buscar usuário por ID específico", async () => {
      const specificUserId = "specific-user-id";
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        id: specificUserId
      });

      const result = await service.findOne(specificUserId);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: specificUserId },
        select: {
          id: true,
          name: true,
          mail: true,
          userType: true,
          createdAt: true,
          updatedAt: true
        }
      });
      expect(result.id).toBe(specificUserId);
    });
  });

  describe("update", () => {
    it("deve atualizar usuário com sucesso", async () => {
      const updatedUser = {
        ...mockUser,
        name: "João Silva Atualizado",
        mail: "joao.novo@email.com"
      };

      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update("user1", mockUpdateUserDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: "user1" },
        data: mockUpdateUserDto
      });
      expect(result).toEqual(updatedUser);
    });

    it("deve atualizar apenas campos fornecidos", async () => {
      const partialUpdate: UpdateUserDto = {
        name: "Apenas Nome Novo"
      };
      const updatedUser = {
        ...mockUser,
        name: "Apenas Nome Novo"
      };

      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update("user1", partialUpdate);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: "user1" },
        data: { name: "Apenas Nome Novo" }
      });
      expect(result.name).toBe("Apenas Nome Novo");
    });

    it("deve atualizar userType", async () => {
      const updateWithUserType: UpdateUserDto = {
        userType: UserType.ADMIN
      };
      const updatedUser = {
        ...mockUser,
        userType: UserType.ADMIN
      };

      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update("user1", updateWithUserType);

      expect(result.userType).toBe(UserType.ADMIN);
    });

    it("deve lançar NotFoundException quando usuário não encontrado", async () => {
      const prismaError = new Error("Record not found");
      (prismaError as any).code = "P2025";

      prismaService.user.update.mockRejectedValue(prismaError);

      await expect(
        service.update("user999", mockUpdateUserDto)
      ).rejects.toThrow();
    });

    it("deve permitir atualização de email", async () => {
      const emailUpdate: UpdateUserDto = {
        mail: "novo.email@teste.com"
      };
      const updatedUser = {
        ...mockUser,
        mail: "novo.email@teste.com"
      };

      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.update("user1", emailUpdate);

      expect(result.mail).toBe("novo.email@teste.com");
    });
  });

  describe("remove", () => {
    it("deve remover usuário com sucesso", async () => {
      prismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove("user1");

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: "user1" }
      });
      expect(result).toEqual(mockUser);
    });

    it("deve propagar erro quando usuário não encontrado", async () => {
      const prismaError = new Error("Record not found");
      (prismaError as any).code = "P2025";

      prismaService.user.delete.mockRejectedValue(prismaError);

      await expect(service.remove("user999")).rejects.toThrow();
    });

    it("deve remover usuário específico", async () => {
      const specificUserId = "user-to-delete";
      const userToDelete = {
        ...mockUser,
        id: specificUserId
      };

      prismaService.user.delete.mockResolvedValue(userToDelete);

      const result = await service.remove(specificUserId);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: specificUserId }
      });
      expect(result.id).toBe(specificUserId);
    });

    it("deve retornar usuário removido", async () => {
      prismaService.user.delete.mockResolvedValue(mockUser);

      const result = await service.remove("user1");

      expect(result).toEqual(mockUser);
      expect(result.id).toBe("user1");
      expect(result.name).toBe("João Silva");
    });
  });
});
