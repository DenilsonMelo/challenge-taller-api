import { Test, TestingModule } from "@nestjs/testing";
import { CartItemService } from "./cart-item.service";
import { PrismaService } from "src/shared/prisma/prisma.service";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { CreateCartItemDto } from "./dto/create-cart-item.dto";

const mockProduct = {
  id: "product1",
  name: "Produto Teste",
  price: 50.0,
  stock: 10,
  imageUrl: "https://example.com/image.jpg",
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockUser = {
  id: "user1",
  name: "João Silva",
  mail: "joao@email.com"
};

const mockCart = {
  id: "cart1",
  clientId: "user1",
  total: 100.0,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: mockUser
};

const mockCartItem = {
  id: "cartItem1",
  productId: "product1",
  cartId: "cart1",
  quantity: 2,
  total: 100.0,
  createdAt: new Date(),
  updatedAt: new Date(),
  product: mockProduct,
  cart: mockCart
};

const mockCreateCartItemDto: CreateCartItemDto = {
  productId: "product1",
  cartId: "cart1",
  quantity: 2,
  total: 100.0
};

const mockPrismaService = {
  product: {
    findUnique: jest.fn()
  },
  cart: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  cartItem: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  }
} as any;

describe("CartItemService", () => {
  let service: CartItemService;
  let prismaService: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartItemService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get<CartItemService>(CartItemService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("deve criar um item no carrinho com sucesso", async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cart.findUnique.mockResolvedValue(mockCart);
      prismaService.cartItem.findFirst.mockResolvedValue(null);
      prismaService.cartItem.create.mockResolvedValue(mockCartItem);
      prismaService.cartItem.findMany.mockResolvedValue([mockCartItem]);

      const result = await service.create(mockCreateCartItemDto);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: "product1" }
      });
      expect(prismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { id: "cart1" }
      });
      expect(prismaService.cartItem.findFirst).toHaveBeenCalledWith({
        where: {
          productId: "product1",
          cartId: "cart1"
        }
      });
      expect(prismaService.cartItem.create).toHaveBeenCalledWith({
        data: {
          productId: "product1",
          cartId: "cart1",
          quantity: 2,
          total: 100.0
        },
        include: {
          product: true,
          cart: true
        }
      });
      expect(result).toEqual(mockCartItem);
    });

    it("deve lançar NotFoundException quando produto não encontrado", async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.create(mockCreateCartItemDto)).rejects.toThrow(
        new NotFoundException("Produto não encontrado")
      );

      expect(prismaService.cart.findUnique).not.toHaveBeenCalled();
      expect(prismaService.cartItem.create).not.toHaveBeenCalled();
    });

    it("deve lançar NotFoundException quando carrinho não encontrado", async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cart.findUnique.mockResolvedValue(null);

      await expect(service.create(mockCreateCartItemDto)).rejects.toThrow(
        new NotFoundException("Carrinho não encontrado")
      );

      expect(prismaService.cartItem.create).not.toHaveBeenCalled();
    });

    it("deve lançar BadRequestException quando estoque insuficiente", async () => {
      const lowStockProduct = { ...mockProduct, stock: 1 };
      prismaService.product.findUnique.mockResolvedValue(lowStockProduct);
      prismaService.cart.findUnique.mockResolvedValue(mockCart);

      await expect(service.create(mockCreateCartItemDto)).rejects.toThrow(
        new BadRequestException("Estoque insuficiente")
      );

      expect(prismaService.cartItem.create).not.toHaveBeenCalled();
    });

    it("deve atualizar item existente quando produto já está no carrinho", async () => {
      const existingCartItem = { ...mockCartItem, quantity: 1 };
      const updatedCartItem = { ...mockCartItem, quantity: 3 };

      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cart.findUnique.mockResolvedValue(mockCart);
      prismaService.cartItem.findFirst.mockResolvedValue(existingCartItem);

      jest.spyOn(service, "update").mockResolvedValue(updatedCartItem);

      const result = await service.create(mockCreateCartItemDto);

      expect(service.update).toHaveBeenCalledWith("cartItem1", { quantity: 3 });
      expect(result).toEqual(updatedCartItem);
    });

    it("deve lançar BadRequestException quando quantidade total excede estoque", async () => {
      const existingCartItem = { ...mockCartItem, quantity: 8 };
      const lowStockProduct = { ...mockProduct, stock: 9 };

      prismaService.product.findUnique.mockResolvedValue(lowStockProduct);
      prismaService.cart.findUnique.mockResolvedValue(mockCart);
      prismaService.cartItem.findFirst.mockResolvedValue(existingCartItem);

      await expect(service.create(mockCreateCartItemDto)).rejects.toThrow(
        new BadRequestException("Estoque insuficiente para a quantidade total")
      );
    });

    it("deve calcular total corretamente", async () => {
      const customDto = { ...mockCreateCartItemDto, quantity: 3 };
      const expectedTotal = mockProduct.price * 3;

      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cart.findUnique.mockResolvedValue(mockCart);
      prismaService.cartItem.findFirst.mockResolvedValue(null);
      prismaService.cartItem.create.mockResolvedValue({
        ...mockCartItem,
        quantity: 3,
        total: expectedTotal
      });
      prismaService.cartItem.findMany.mockResolvedValue([]);

      await service.create(customDto);

      expect(prismaService.cartItem.create).toHaveBeenCalledWith({
        data: {
          productId: "product1",
          cartId: "cart1",
          quantity: 3,
          total: expectedTotal
        },
        include: {
          product: true,
          cart: true
        }
      });
    });
  });

  describe("findAll", () => {
    it("deve retornar todos os itens do carrinho", async () => {
      const mockCartItems = [
        mockCartItem,
        { ...mockCartItem, id: "cartItem2" }
      ];
      prismaService.cartItem.findMany.mockResolvedValue(mockCartItems);

      const result = await service.findAll();

      expect(prismaService.cartItem.findMany).toHaveBeenCalledWith({
        include: {
          product: true,
          cart: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  mail: true
                }
              }
            }
          }
        }
      });
      expect(result).toEqual(mockCartItems);
    });
  });

  describe("findByUserId", () => {
    it("deve retornar itens do carrinho por usuário", async () => {
      const mockCartItems = [mockCartItem];
      prismaService.cartItem.findMany.mockResolvedValue(mockCartItems);

      const result = await service.findByUserId("user1");

      expect(prismaService.cartItem.findMany).toHaveBeenCalledWith({
        where: {
          cart: {
            clientId: "user1",
            order: null
          }
        },
        include: {
          product: true,
          cart: true
        }
      });
      expect(result).toEqual(mockCartItems);
    });
  });

  describe("findOne", () => {
    it("deve retornar um item do carrinho quando encontrado", async () => {
      prismaService.cartItem.findUnique.mockResolvedValue(mockCartItem);

      const result = await service.findOne("cartItem1");

      expect(prismaService.cartItem.findUnique).toHaveBeenCalledWith({
        where: { id: "cartItem1" },
        include: {
          product: true,
          cart: true
        }
      });
      expect(result).toEqual(mockCartItem);
    });

    it("deve lançar NotFoundException quando item não encontrado", async () => {
      prismaService.cartItem.findUnique.mockResolvedValue(null);

      await expect(service.findOne("cartItem999")).rejects.toThrow(
        new NotFoundException("Item do carrinho não encontrado")
      );
    });
  });

  describe("findByCartId", () => {
    it("deve retornar itens por ID do carrinho", async () => {
      const mockCartItems = [mockCartItem];
      prismaService.cartItem.findMany.mockResolvedValue(mockCartItems);

      const result = await service.findByCartId("cart1");

      expect(prismaService.cartItem.findMany).toHaveBeenCalledWith({
        where: { cartId: "cart1" },
        include: {
          product: true
        }
      });
      expect(result).toEqual(mockCartItems);
    });
  });

  describe("update", () => {
    it("deve atualizar item do carrinho com sucesso", async () => {
      const updatedCartItem = { ...mockCartItem, quantity: 3, total: 150 };

      jest.spyOn(service, "findOne").mockResolvedValue(mockCartItem);
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cartItem.update.mockResolvedValue(updatedCartItem);
      prismaService.cartItem.findMany.mockResolvedValue([updatedCartItem]);

      const result = await service.update("cartItem1", { quantity: 3 });

      expect(service.findOne).toHaveBeenCalledWith("cartItem1");
      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: "product1" }
      });
      expect(prismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: "cartItem1" },
        data: { quantity: 3, total: 150 },
        include: {
          product: true,
          cart: true
        }
      });
      expect(result).toEqual(updatedCartItem);
    });

    it("deve lançar BadRequestException quando quantidade é zero ou negativa", async () => {
      jest.spyOn(service, "findOne").mockResolvedValue(mockCartItem);

      await expect(
        service.update("cartItem1", { quantity: 0 })
      ).rejects.toThrow(
        new BadRequestException("Quantidade deve ser maior que zero")
      );

      await expect(
        service.update("cartItem1", { quantity: -1 })
      ).rejects.toThrow(
        new BadRequestException("Quantidade deve ser maior que zero")
      );
    });

    it("deve lançar BadRequestException quando quantidade excede estoque", async () => {
      jest.spyOn(service, "findOne").mockResolvedValue(mockCartItem);
      const lowStockProduct = { ...mockProduct, stock: 2 };
      prismaService.product.findUnique.mockResolvedValue(lowStockProduct);

      await expect(
        service.update("cartItem1", { quantity: 5 })
      ).rejects.toThrow(new BadRequestException("Estoque insuficiente"));
    });

    it("deve calcular novo total quando quantidade é atualizada", async () => {
      jest.spyOn(service, "findOne").mockResolvedValue(mockCartItem);
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cartItem.update.mockResolvedValue({
        ...mockCartItem,
        quantity: 4,
        total: 200
      });
      prismaService.cartItem.findMany.mockResolvedValue([]);

      await service.update("cartItem1", { quantity: 4 });

      expect(prismaService.cartItem.update).toHaveBeenCalledWith({
        where: { id: "cartItem1" },
        data: { quantity: 4, total: 200 },
        include: {
          product: true,
          cart: true
        }
      });
    });
  });

  describe("remove", () => {
    it("deve remover item do carrinho com sucesso", async () => {
      jest.spyOn(service, "findOne").mockResolvedValue(mockCartItem);
      prismaService.cartItem.delete.mockResolvedValue(mockCartItem);
      prismaService.cartItem.findMany.mockResolvedValue([]);

      const result = await service.remove("cartItem1");

      expect(service.findOne).toHaveBeenCalledWith("cartItem1");
      expect(prismaService.cartItem.delete).toHaveBeenCalledWith({
        where: { id: "cartItem1" }
      });
      expect(result).toEqual({
        message: "Item removido do carrinho com sucesso"
      });
    });

    it("deve atualizar total do carrinho após remoção", async () => {
      const remainingItems = [{ ...mockCartItem, id: "cartItem2", total: 50 }];

      jest.spyOn(service, "findOne").mockResolvedValue(mockCartItem);
      prismaService.cartItem.delete.mockResolvedValue(mockCartItem);
      prismaService.cartItem.findMany.mockResolvedValue(remainingItems);
      prismaService.cart.update.mockResolvedValue({
        ...mockCart,
        total: 50
      });

      await service.remove("cartItem1");

      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: { total: 50 }
      });
    });
  });

  describe("removeAllFromCart", () => {
    it("deve remover todos os itens do carrinho", async () => {
      prismaService.cartItem.deleteMany.mockResolvedValue({ count: 3 });
      prismaService.cart.update.mockResolvedValue({
        ...mockCart,
        total: 0
      });

      const result = await service.removeAllFromCart("cart1");

      expect(prismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: "cart1" }
      });
      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: { total: 0 }
      });
      expect(result).toEqual({
        message: "Todos os itens foram removidos do carrinho"
      });
    });
  });

  describe("updateCartTotal (método privado)", () => {
    it("deve atualizar o total do carrinho corretamente", async () => {
      const cartItems = [
        { ...mockCartItem, total: 100 },
        { ...mockCartItem, id: "cartItem2", total: 50 }
      ];

      prismaService.cartItem.findMany.mockResolvedValue(cartItems);
      prismaService.cart.update.mockResolvedValue({
        ...mockCart,
        total: 150
      });

      jest.spyOn(service, "findOne").mockResolvedValue(mockCartItem);
      prismaService.cartItem.delete.mockResolvedValue(mockCartItem);

      await service.remove("cartItem1");

      expect(prismaService.cartItem.findMany).toHaveBeenCalledWith({
        where: { cartId: "cart1" },
        include: { product: true }
      });
      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: { total: 150 }
      });
    });

    it("deve definir total como 0 quando não há itens", async () => {
      prismaService.cartItem.findMany.mockResolvedValue([]);
      prismaService.cart.update.mockResolvedValue({
        ...mockCart,
        total: 0
      });

      jest.spyOn(service, "findOne").mockResolvedValue(mockCartItem);
      prismaService.cartItem.delete.mockResolvedValue(mockCartItem);

      await service.remove("cartItem1");

      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: { total: 0 }
      });
    });
  });
});
