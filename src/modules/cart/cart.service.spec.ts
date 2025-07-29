import { Test, TestingModule } from "@nestjs/testing";
import { CartService } from "./cart.service";
import { PrismaService } from "src/shared/prisma/prisma.service";
import {
  NotFoundException,
  ConflictException,
  BadRequestException
} from "@nestjs/common";
import { CreateCartDto } from "./dto/create-cart.dto";
import { UpdateCartDto } from "./dto/update-cart.dto";

const mockUser = {
  id: "user1",
  name: "João Silva",
  mail: "joao@email.com",
  userType: "CLIENT",
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockProduct = {
  id: "product1",
  name: "Produto Teste",
  price: 50.0,
  stock: 10,
  imageUrl: "https://example.com/image.jpg",
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockCartItem = {
  id: "cartItem1",
  productId: "product1",
  cartId: "cart1",
  quantity: 2,
  total: 100.0,
  createdAt: new Date(),
  updatedAt: new Date(),
  product: mockProduct
};

const mockCart = {
  id: "cart1",
  clientId: "user1",
  total: 100.0,
  createdAt: new Date(),
  updatedAt: new Date(),
  cartItems: [mockCartItem],
  user: mockUser
};

const mockOrder = {
  id: "order1",
  cartId: "cart1",
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockCreateCartDto: CreateCartDto = {
  clientId: "user1"
};

const mockUpdateCartDto: UpdateCartDto = {
  clientId: "user2"
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn()
  },
  cart: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  order: {
    findUnique: jest.fn()
  },
  cartItem: {
    findMany: jest.fn()
  }
} as any;

describe("CartService", () => {
  let service: CartService;
  let prismaService: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get<CartService>(CartService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("deve criar um carrinho com sucesso", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cart.findFirst.mockResolvedValue(null);
      prismaService.cart.create.mockResolvedValue(mockCart);

      const result = await service.create(mockCreateCartDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user1" }
      });
      expect(prismaService.cart.findFirst).toHaveBeenCalledWith({
        where: { clientId: "user1", order: null }
      });
      expect(prismaService.cart.create).toHaveBeenCalledWith({
        data: {
          clientId: "user1",
          total: 0
        },
        include: {
          cartItems: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              mail: true
            }
          }
        }
      });
      expect(result).toEqual(mockCart);
    });

    it("deve lançar BadRequestException quando usuário não encontrado", async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create(mockCreateCartDto)).rejects.toThrow(
        new BadRequestException("Usuário não encontrado")
      );

      expect(prismaService.cart.findFirst).not.toHaveBeenCalled();
      expect(prismaService.cart.create).not.toHaveBeenCalled();
    });

    it("deve lançar ConflictException quando usuário já possui carrinho ativo", async () => {
      const existingCart = { ...mockCart, id: "existingCart1" };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cart.findFirst.mockResolvedValue(existingCart);

      await expect(service.create(mockCreateCartDto)).rejects.toThrow(
        new ConflictException("Usuário já possui um carrinho ativo")
      );

      expect(prismaService.cart.create).not.toHaveBeenCalled();
    });

    it("deve criar carrinho com total inicial zero", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cart.findFirst.mockResolvedValue(null);
      prismaService.cart.create.mockResolvedValue({
        ...mockCart,
        total: 0,
        cartItems: []
      });

      const result = await service.create(mockCreateCartDto);

      expect(prismaService.cart.create).toHaveBeenCalledWith({
        data: {
          clientId: "user1",
          total: 0
        },
        include: {
          cartItems: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              mail: true
            }
          }
        }
      });
      expect(result.total).toBe(0);
    });
  });

  describe("findAll", () => {
    it("deve retornar todos os carrinhos", async () => {
      const mockCarts = [
        mockCart,
        { ...mockCart, id: "cart2", clientId: "user2" }
      ];
      prismaService.cart.findMany.mockResolvedValue(mockCarts);

      const result = await service.findAll();

      expect(prismaService.cart.findMany).toHaveBeenCalledWith({
        include: {
          cartItems: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              mail: true
            }
          }
        }
      });
      expect(result).toEqual(mockCarts);
      expect(result).toHaveLength(2);
    });

    it("deve retornar array vazio quando não há carrinhos", async () => {
      prismaService.cart.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("deve incluir informações do usuário e produtos", async () => {
      prismaService.cart.findMany.mockResolvedValue([mockCart]);

      const result = await service.findAll();

      expect(result[0]).toHaveProperty("user");
      expect(result[0]).toHaveProperty("cartItems");
      expect(result[0].cartItems[0]).toHaveProperty("product");
      expect(result[0].user).not.toHaveProperty("password");
    });
  });

  describe("findByClientId", () => {
    it("deve retornar carrinho ativo do cliente", async () => {
      prismaService.cart.findFirst.mockResolvedValue(mockCart);

      const result = await service.findByClientId("user1");

      expect(prismaService.cart.findFirst).toHaveBeenCalledWith({
        where: { clientId: "user1", order: null },
        include: {
          cartItems: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              mail: true
            }
          }
        }
      });
      expect(result).toEqual(mockCart);
    });

    it("deve retornar null quando cliente não tem carrinho ativo", async () => {
      prismaService.cart.findFirst.mockResolvedValue(null);

      const result = await service.findByClientId("user999");

      expect(result).toBeNull();
    });

    it("deve buscar apenas carrinhos não convertidos em pedido", async () => {
      prismaService.cart.findFirst.mockResolvedValue(mockCart);

      await service.findByClientId("user1");

      expect(prismaService.cart.findFirst).toHaveBeenCalledWith({
        where: { clientId: "user1", order: null },
        include: expect.any(Object)
      });
    });

    it("deve incluir itens do carrinho e produtos", async () => {
      prismaService.cart.findFirst.mockResolvedValue(mockCart);

      const result = await service.findByClientId("user1");

      expect(result.cartItems).toBeDefined();
      expect(result.cartItems[0].product).toBeDefined();
      expect(result.user).toBeDefined();
    });
  });

  describe("findOne", () => {
    it("deve retornar um carrinho quando encontrado", async () => {
      prismaService.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.findOne("cart1");

      expect(prismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { id: "cart1" },
        include: {
          cartItems: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              mail: true
            }
          }
        }
      });
      expect(result).toEqual(mockCart);
    });

    it("deve lançar NotFoundException quando carrinho não encontrado", async () => {
      prismaService.cart.findUnique.mockResolvedValue(null);

      await expect(service.findOne("cart999")).rejects.toThrow(
        new NotFoundException("Carrinho não encontrado")
      );
    });

    it("deve buscar carrinho por ID específico", async () => {
      const specificCartId = "specific-cart-id";
      prismaService.cart.findUnique.mockResolvedValue({
        ...mockCart,
        id: specificCartId
      });

      const result = await service.findOne(specificCartId);

      expect(prismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { id: specificCartId },
        include: expect.any(Object)
      });
      expect(result.id).toBe(specificCartId);
    });
  });

  describe("update", () => {
    it("deve atualizar carrinho com sucesso", async () => {
      const updatedCart = {
        ...mockCart,
        clientId: "user2"
      };

      jest.spyOn(service, "findOne").mockResolvedValue(mockCart);
      prismaService.cart.update.mockResolvedValue(updatedCart);

      const result = await service.update("cart1", mockUpdateCartDto);

      expect(service.findOne).toHaveBeenCalledWith("cart1");
      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: mockUpdateCartDto,
        include: {
          cartItems: {
            include: {
              product: true
            }
          }
        }
      });
      expect(result).toEqual(updatedCart);
    });

    it("deve lançar NotFoundException quando carrinho não encontrado", async () => {
      jest
        .spyOn(service, "findOne")
        .mockRejectedValue(new NotFoundException("Carrinho não encontrado"));

      await expect(
        service.update("cart999", mockUpdateCartDto)
      ).rejects.toThrow(new NotFoundException("Carrinho não encontrado"));

      expect(prismaService.cart.update).not.toHaveBeenCalled();
    });

    it("deve atualizar campos específicos", async () => {
      const partialUpdate: UpdateCartDto = {
        clientId: "new-user-id"
      };

      jest.spyOn(service, "findOne").mockResolvedValue(mockCart);
      prismaService.cart.update.mockResolvedValue({
        ...mockCart,
        clientId: "new-user-id"
      });

      const result = await service.update("cart1", partialUpdate);

      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: partialUpdate,
        include: expect.any(Object)
      });
      expect(result.clientId).toBe("new-user-id");
    });

    it("deve verificar existência antes de atualizar", async () => {
      jest.spyOn(service, "findOne").mockResolvedValue(mockCart);
      prismaService.cart.update.mockResolvedValue(mockCart);

      await service.update("cart1", mockUpdateCartDto);

      expect(service.findOne).toHaveBeenCalledWith("cart1");
      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: mockUpdateCartDto,
        include: {
          cartItems: {
            include: {
              product: true
            }
          }
        }
      });
    });
  });

  describe("remove", () => {
    it("deve remover carrinho com sucesso", async () => {
      prismaService.order.findUnique.mockResolvedValue(null);
      prismaService.cart.delete.mockResolvedValue(mockCart);

      const result = await service.remove("cart1");

      expect(prismaService.order.findUnique).toHaveBeenCalledWith({
        where: { cartId: "cart1" }
      });
      expect(prismaService.cart.delete).toHaveBeenCalledWith({
        where: { id: "cart1" }
      });
      expect(result).toEqual(mockCart);
    });

    it("deve lançar ConflictException quando carrinho já foi convertido em pedido", async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.remove("cart1")).rejects.toThrow(
        new ConflictException(
          "Não é possível remover carrinho que já foi convertido em pedido"
        )
      );

      expect(prismaService.cart.delete).not.toHaveBeenCalled();
    });

    it("deve verificar existência de pedido antes de remover", async () => {
      prismaService.order.findUnique.mockResolvedValue(null);
      prismaService.cart.delete.mockResolvedValue(mockCart);

      await service.remove("cart1");

      expect(prismaService.order.findUnique).toHaveBeenCalledWith({
        where: { cartId: "cart1" }
      });
      expect(prismaService.cart.delete).toHaveBeenCalledWith({
        where: { id: "cart1" }
      });
    });

    it("deve remover carrinho específico", async () => {
      const specificCartId = "cart-to-delete";
      const cartToDelete = { ...mockCart, id: specificCartId };

      prismaService.order.findUnique.mockResolvedValue(null);
      prismaService.cart.delete.mockResolvedValue(cartToDelete);

      const result = await service.remove(specificCartId);

      expect(prismaService.order.findUnique).toHaveBeenCalledWith({
        where: { cartId: specificCartId }
      });
      expect(prismaService.cart.delete).toHaveBeenCalledWith({
        where: { id: specificCartId }
      });
      expect(result.id).toBe(specificCartId);
    });
  });

  describe("calculateTotal", () => {
    it("deve calcular total do carrinho corretamente", async () => {
      const cartItems = [
        { ...mockCartItem, total: 100 },
        { ...mockCartItem, id: "cartItem2", total: 50 },
        { ...mockCartItem, id: "cartItem3", total: 25 }
      ];

      prismaService.cartItem.findMany.mockResolvedValue(cartItems);

      const result = await service.calculateTotal("cart1");

      expect(prismaService.cartItem.findMany).toHaveBeenCalledWith({
        where: { cartId: "cart1" },
        include: { product: true }
      });
      expect(result).toBe(175);
    });

    it("deve retornar 0 quando carrinho está vazio", async () => {
      prismaService.cartItem.findMany.mockResolvedValue([]);

      const result = await service.calculateTotal("cart1");

      expect(result).toBe(0);
    });

    it("deve incluir informações do produto no cálculo", async () => {
      const cartItems = [mockCartItem];
      prismaService.cartItem.findMany.mockResolvedValue(cartItems);

      await service.calculateTotal("cart1");

      expect(prismaService.cartItem.findMany).toHaveBeenCalledWith({
        where: { cartId: "cart1" },
        include: { product: true }
      });
    });
  });

  describe("updateTotal", () => {
    it("deve atualizar total do carrinho", async () => {
      const cartItems = [
        { ...mockCartItem, total: 150 },
        { ...mockCartItem, id: "cartItem2", total: 75 }
      ];

      prismaService.cartItem.findMany.mockResolvedValue(cartItems);
      prismaService.cart.update.mockResolvedValue({
        ...mockCart,
        total: 225
      });

      await service.updateTotal("cart1");

      expect(prismaService.cartItem.findMany).toHaveBeenCalledWith({
        where: { cartId: "cart1" },
        include: { product: true }
      });
      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: { total: 225 }
      });
    });

    it("deve atualizar total para 0 quando carrinho vazio", async () => {
      prismaService.cartItem.findMany.mockResolvedValue([]);
      prismaService.cart.update.mockResolvedValue({
        ...mockCart,
        total: 0
      });

      await service.updateTotal("cart1");

      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: { total: 0 }
      });
    });

    it("deve usar calculateTotal internamente", async () => {
      const calculateTotalSpy = jest.spyOn(service, "calculateTotal");
      calculateTotalSpy.mockResolvedValue(300);

      prismaService.cart.update.mockResolvedValue(mockCart);

      await service.updateTotal("cart1");

      expect(calculateTotalSpy).toHaveBeenCalledWith("cart1");
      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: { total: 300 }
      });

      calculateTotalSpy.mockRestore();
    });

    it("deve propagar erro quando atualização falha", async () => {
      prismaService.cartItem.findMany.mockResolvedValue([mockCartItem]);
      prismaService.cart.update.mockRejectedValue(new Error("Update failed"));

      await expect(service.updateTotal("cart1")).rejects.toThrow(
        "Update failed"
      );
    });
  });

  describe("validações de negócio", () => {
    it("deve impedir criação de múltiplos carrinhos ativos", async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cart.findFirst.mockResolvedValue(mockCart);

      await expect(service.create(mockCreateCartDto)).rejects.toThrow(
        new ConflictException("Usuário já possui um carrinho ativo")
      );
    });

    it("deve impedir remoção de carrinho com pedido", async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.remove("cart1")).rejects.toThrow(
        new ConflictException(
          "Não é possível remover carrinho que já foi convertido em pedido"
        )
      );
    });

    it("deve buscar apenas carrinhos ativos", async () => {
      await service.findByClientId("user1");

      expect(prismaService.cart.findFirst).toHaveBeenCalledWith({
        where: { clientId: "user1", order: null },
        include: expect.any(Object)
      });
    });

    it("deve incluir produtos nos itens do carrinho", async () => {
      prismaService.cart.findUnique.mockResolvedValue(mockCart);

      await service.findOne("cart1");

      expect(prismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { id: "cart1" },
        include: {
          cartItems: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              mail: true
            }
          }
        }
      });
    });
  });
});
