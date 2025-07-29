import { Test, TestingModule } from "@nestjs/testing";
import { OrderService } from "./order.service";
import { PrismaService } from "src/shared/prisma/prisma.service";
import {
  NotFoundException,
  BadRequestException,
  ConflictException
} from "@nestjs/common";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderDto } from "./dto/update-order.dto";

const mockUser = {
  id: "user1",
  name: "João Silva",
  mail: "joao@email.com"
};

const mockProduct = {
  id: "product1",
  name: "Produto Teste",
  price: 99.99,
  stock: 10,
  imageUrl: "https://example.com/image.jpg",
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockCartItem = {
  id: "cartItem1",
  cartId: "cart1",
  productId: "product1",
  quantity: 2,
  total: 199.98,
  createdAt: new Date(),
  updatedAt: new Date(),
  product: mockProduct
};

const mockCart = {
  id: "cart1",
  clientId: "user1",
  total: 199.98,
  createdAt: new Date(),
  updatedAt: new Date(),
  cartItems: [mockCartItem],
  user: mockUser
};

const mockOrder = {
  id: "order1",
  cartId: "cart1",
  createdAt: new Date(),
  updatedAt: new Date(),
  cart: mockCart
};

const mockCreateOrderDto: CreateOrderDto = {
  cartId: "cart1"
};

const mockUpdateOrderDto: UpdateOrderDto = {
  cartId: "cart2"
};

const mockPrismaService = {
  cart: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  product: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn()
  },
  $transaction: jest.fn()
} as any;

describe("OrderService", () => {
  let service: OrderService;
  let prismaService: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get<OrderService>(OrderService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("deve criar um pedido com sucesso", async () => {
      prismaService.cart.findUnique.mockResolvedValue(mockCart);
      prismaService.order.findUnique.mockResolvedValue(null);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          cart: { findUnique: jest.fn().mockResolvedValue(mockCart) },
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            updateMany: jest.fn().mockResolvedValue({ count: 1 })
          },
          order: { create: jest.fn().mockResolvedValue(mockOrder) }
        });
      });

      const result = await service.create(mockCreateOrderDto);

      expect(prismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { id: "cart1" },
        include: {
          cartItems: { include: { product: true } },
          user: { select: { id: true, name: true, mail: true } }
        }
      });
      expect(result).toEqual(mockOrder);
    });

    it("deve lançar NotFoundException quando carrinho não encontrado", async () => {
      prismaService.cart.findUnique.mockResolvedValue(null);

      await expect(service.create(mockCreateOrderDto)).rejects.toThrow(
        new NotFoundException("Carrinho não encontrado")
      );
    });

    it("deve lançar BadRequestException quando carrinho está vazio", async () => {
      const emptyCart = { ...mockCart, cartItems: [] };
      prismaService.cart.findUnique.mockResolvedValue(emptyCart);

      await expect(service.create(mockCreateOrderDto)).rejects.toThrow(
        new BadRequestException(
          "Não é possível criar pedido com carrinho vazio"
        )
      );
    });

    it("deve lançar ConflictException quando já existe pedido para o carrinho", async () => {
      prismaService.cart.findUnique.mockResolvedValue(mockCart);
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.create(mockCreateOrderDto)).rejects.toThrow(
        new ConflictException("Já existe um pedido para este carrinho")
      );
    });

    it("deve lançar BadRequestException quando estoque insuficiente", async () => {
      const lowStockProduct = { ...mockProduct, stock: 1 };
      const cartWithLowStock = {
        ...mockCart,
        cartItems: [{ ...mockCartItem, product: lowStockProduct }]
      };
      prismaService.cart.findUnique.mockResolvedValue(cartWithLowStock);
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.create(mockCreateOrderDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it("deve lançar ConflictException por concorrência no estoque", async () => {
      prismaService.cart.findUnique.mockResolvedValue(mockCart);
      prismaService.order.findUnique.mockResolvedValue(null);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          cart: { findUnique: jest.fn().mockResolvedValue(mockCart) },
          product: {
            findUnique: jest.fn().mockResolvedValue(mockProduct),
            updateMany: jest.fn().mockResolvedValue({ count: 0 })
          },
          order: { create: jest.fn().mockResolvedValue(mockOrder) }
        });
      });

      await expect(service.create(mockCreateOrderDto)).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe("findAll", () => {
    it("deve retornar todos os pedidos", async () => {
      const mockOrders = [mockOrder, { ...mockOrder, id: "order2" }];
      prismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findAll();

      expect(prismaService.order.findMany).toHaveBeenCalledWith({
        include: {
          cart: {
            include: {
              cartItems: { include: { product: true } },
              user: { select: { id: true, name: true, mail: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      expect(result).toEqual(mockOrders);
    });
  });

  describe("findOne", () => {
    it("deve retornar um pedido quando encontrado", async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne("order1");

      expect(prismaService.order.findUnique).toHaveBeenCalledWith({
        where: { id: "order1" },
        include: {
          cart: {
            include: {
              cartItems: { include: { product: true } },
              user: { select: { id: true, name: true, mail: true } }
            }
          }
        }
      });
      expect(result).toEqual(mockOrder);
    });

    it("deve lançar NotFoundException quando pedido não encontrado", async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne("order999")).rejects.toThrow(
        new NotFoundException("Pedido não encontrado")
      );
    });
  });

  describe("findByUserId", () => {
    it("deve retornar pedidos do usuário", async () => {
      const mockOrders = [mockOrder];
      prismaService.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.findByUserId("user1");

      expect(prismaService.order.findMany).toHaveBeenCalledWith({
        where: { cart: { clientId: "user1" } },
        include: {
          cart: {
            include: {
              cartItems: { include: { product: true } },
              user: { select: { id: true, name: true, mail: true } }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      });
      expect(result).toEqual(mockOrders);
    });
  });

  describe("update", () => {
    it("deve atualizar pedido com sucesso", async () => {
      const updatedOrder = { ...mockOrder, cartId: "cart2" };
      prismaService.cart.findUnique.mockResolvedValue({ id: "cart2" });
      prismaService.order.findUnique.mockResolvedValue(null);
      prismaService.order.update.mockResolvedValue(updatedOrder);

      const result = await service.update("order1", mockUpdateOrderDto);

      expect(prismaService.cart.findUnique).toHaveBeenCalledWith({
        where: { id: "cart2" }
      });
      expect(prismaService.order.update).toHaveBeenCalledWith({
        where: { id: "order1" },
        data: mockUpdateOrderDto,
        include: {
          cart: {
            include: {
              cartItems: { include: { product: true } },
              user: { select: { id: true, name: true, mail: true } }
            }
          }
        }
      });
      expect(result).toEqual(updatedOrder);
    });

    it("deve lançar NotFoundException quando carrinho não encontrado", async () => {
      prismaService.cart.findUnique.mockResolvedValue(null);

      await expect(
        service.update("order1", mockUpdateOrderDto)
      ).rejects.toThrow(new NotFoundException("Carrinho não encontrado"));
    });

    it("deve lançar ConflictException quando carrinho já tem outro pedido", async () => {
      const existingOrder = { id: "order2", cartId: "cart2" };
      prismaService.cart.findUnique.mockResolvedValue({ id: "cart2" });
      prismaService.order.findUnique.mockResolvedValue(existingOrder);

      await expect(
        service.update("order1", mockUpdateOrderDto)
      ).rejects.toThrow(
        new ConflictException("Já existe um pedido para este carrinho")
      );
    });
  });

  describe("remove", () => {
    it("deve remover pedido e restaurar estoque", async () => {
      jest.spyOn(service, "findOne").mockResolvedValue(mockOrder);

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          product: { update: jest.fn().mockResolvedValue(mockProduct) },
          order: { delete: jest.fn().mockResolvedValue(mockOrder) }
        });
      });

      const result = await service.remove("order1");

      expect(service.findOne).toHaveBeenCalledWith("order1");
      expect(result).toEqual({
        message: "Pedido cancelado e estoque restaurado com sucesso"
      });
    });
  });

  describe("getOrderSummary", () => {
    it("deve retornar resumo dos pedidos", async () => {
      const ordersWithCart = [
        { ...mockOrder, cart: { total: 100 } },
        { ...mockOrder, cart: { total: 200 } }
      ];

      prismaService.order.count.mockResolvedValue(2);
      prismaService.order.findMany.mockResolvedValue(ordersWithCart);

      const result = await service.getOrderSummary();

      expect(prismaService.order.count).toHaveBeenCalled();
      expect(prismaService.order.findMany).toHaveBeenCalledWith({
        include: { cart: true }
      });
      expect(result).toEqual({
        totalOrders: 2,
        totalRevenue: 300
      });
    });
  });
});
