import { Test, TestingModule } from "@nestjs/testing";
import { ProductService } from "./product.service";
import { S3Service } from "src/shared/s3/s3.service";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { PrismaService } from "src/shared/prisma/prisma.service";

const mockFile = {
  fieldname: "file",
  originalname: "test.jpg",
  encoding: "7bit",
  mimetype: "image/jpeg",
  buffer: Buffer.from("test"),
  size: 1024
} as any;

const mockProduct = {
  id: "1",
  name: "Produto Teste",
  price: 99.99,
  stock: 10,
  imageUrl: "https://example.com/image.jpg"
};

const mockCreateProductDto: CreateProductDto = {
  name: "Produto Teste",
  price: 99.99,
  stock: 10
};

const mockUpdateProductDto: UpdateProductDto = {
  name: "Produto Atualizado",
  price: 149.99
};

const mockPrismaService = {
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  cartItem: {
    count: jest.fn(),
    deleteMany: jest.fn()
  },
  cart: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  $transaction: jest.fn()
} as any;

const mockS3Service = {
  uploadImage: jest.fn()
} as any;

describe("ProductService", () => {
  let service: ProductService;
  let prismaService: typeof mockPrismaService;
  let s3Service: typeof mockS3Service;

  beforeEach(async () => {
    const mockPrismaService = {
      product: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      cartItem: {
        count: jest.fn(),
        deleteMany: jest.fn()
      },
      cart: {
        findMany: jest.fn(),
        update: jest.fn()
      },
      $transaction: jest.fn()
    };

    const mockS3Service = {
      uploadImage: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        },
        {
          provide: S3Service,
          useValue: mockS3Service
        }
      ]
    }).compile();

    service = module.get<ProductService>(ProductService);
    prismaService = module.get(PrismaService);
    s3Service = module.get(S3Service);

    service = module.get<ProductService>(ProductService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
    s3Service = module.get(S3Service) as jest.Mocked<S3Service>;

    (prismaService.product.create as jest.Mock) = jest.fn();
    (prismaService.product.findMany as jest.Mock) = jest.fn();
    (prismaService.product.findUnique as jest.Mock) = jest.fn();
    (prismaService.product.update as jest.Mock) = jest.fn();
    (prismaService.product.delete as jest.Mock) = jest.fn();
    (prismaService.cartItem.count as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("deve criar um produto com sucesso", async () => {
      s3Service.uploadImage.mockResolvedValue("https://example.com/image.jpg");
      prismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(mockCreateProductDto, mockFile);

      expect(s3Service.uploadImage).toHaveBeenCalledWith(mockFile, "products");
      expect(prismaService.product.create).toHaveBeenCalledWith({
        data: {
          ...mockCreateProductDto,
          imageUrl: "https://example.com/image.jpg"
        }
      });
      expect(result).toEqual(mockProduct);
    });

    it("deve falhar se o upload da imagem falhar", async () => {
      s3Service.uploadImage.mockRejectedValue(new Error("Upload failed"));

      await expect(
        service.create(mockCreateProductDto, mockFile)
      ).rejects.toThrow("Upload failed");
      expect(prismaService.product.create).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("deve retornar todos os produtos", async () => {
      const mockProducts = [mockProduct, { ...mockProduct, id: "2" }];
      prismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.findAll();

      expect(prismaService.product.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
    });
  });

  describe("findOne", () => {
    it("deve retornar um produto quando encontrado", async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOne("1");

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: "1" }
      });
      expect(result).toEqual(mockProduct);
    });

    it("deve lançar NotFoundException quando produto não encontrado", async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne("999")).rejects.toThrow(
        new NotFoundException("Produto não encontrado")
      );
    });
  });

  describe("update", () => {
    it("deve atualizar produto sem nova imagem", async () => {
      const updatedProduct = { ...mockProduct, ...mockUpdateProductDto };
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.product.update.mockResolvedValue(updatedProduct);

      const result = await service.update("1", mockUpdateProductDto);

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: "1" }
      });
      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: mockUpdateProductDto
      });
      expect(result).toEqual(updatedProduct);
    });

    it("deve atualizar produto com nova imagem", async () => {
      const updatedProduct = {
        ...mockProduct,
        ...mockUpdateProductDto,
        imageUrl: "new-url"
      };
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.product.update.mockResolvedValue(updatedProduct);
      s3Service.uploadImage.mockResolvedValue("new-url");

      const result = await service.update("1", mockUpdateProductDto, mockFile);

      expect(s3Service.uploadImage).toHaveBeenCalledWith(mockFile, "products");
      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: { ...mockUpdateProductDto, imageUrl: "new-url" }
      });
      expect(result).toEqual(updatedProduct);
    });

    it("deve lançar NotFoundException quando produto não encontrado", async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update("999", mockUpdateProductDto)).rejects.toThrow(
        new NotFoundException("Produto não encontrado")
      );
    });
  });

  describe("remove", () => {
    it("deve remover produto com sucesso", async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cartItem.count.mockResolvedValue(0);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.cartItem.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.cart.findMany.mockResolvedValue([]);
      prismaService.product.delete.mockResolvedValue(mockProduct);

      const result = await service.remove("1");

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: "1" }
      });
      expect(prismaService.cartItem.count).toHaveBeenCalledWith({
        where: {
          productId: "1",
          cart: {
            order: {
              isNot: null
            }
          }
        }
      });
      expect(result).toEqual(mockProduct);
    });

    it("deve lançar NotFoundException quando produto não encontrado", async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove("999")).rejects.toThrow(
        new NotFoundException("Produto não encontrado")
      );
    });

    it("deve lançar ConflictException quando produto está em pedidos", async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cartItem.count.mockResolvedValue(5);

      await expect(service.remove("1")).rejects.toThrow(
        new ConflictException(
          "Não é possível excluir este produto pois ele está presente em pedidos existentes"
        )
      );
    });

    it("deve atualizar carrinho quando remover produto", async () => {
      const mockCart = {
        id: "cart1",
        cartItems: [
          { productId: "1", total: 50 },
          { productId: "2", total: 30 }
        ]
      };

      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cartItem.count.mockResolvedValue(0);
      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(prismaService);
      });
      prismaService.cartItem.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.cart.findMany.mockResolvedValue([mockCart]);
      prismaService.cart.update.mockResolvedValue({ ...mockCart, total: 30 });
      prismaService.product.delete.mockResolvedValue(mockProduct);

      await service.remove("1");

      expect(prismaService.cart.update).toHaveBeenCalledWith({
        where: { id: "cart1" },
        data: { total: 30 }
      });
    });

    it("deve lançar ConflictException quando transação falha", async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct);
      prismaService.cartItem.count.mockResolvedValue(0);
      prismaService.$transaction.mockRejectedValue(
        new Error("Transaction failed")
      );

      await expect(service.remove("1")).rejects.toThrow(
        new ConflictException("Erro ao deletar produto")
      );
    });
  });
});
