import { CategoriesService } from '../../../../backend/src/menu/services/categories.service';
import { createMockPrismaService } from '../../mocks/prisma.mock';
import { createMockCloudinaryService } from '../../mocks/cloudinary.mock';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prismaMock: ReturnType<typeof createMockPrismaService>;
  let cloudinaryMock: ReturnType<typeof createMockCloudinaryService>;

  beforeEach(() => {
    prismaMock = createMockPrismaService();
    cloudinaryMock = createMockCloudinaryService();
    service = new CategoriesService(prismaMock as any, cloudinaryMock as any);
  });

  describe('findAll', () => {
    it('returns categories ordered by sortOrder', async () => {
      prismaMock.client.menuCategory.findMany.mockResolvedValue([
        { id: 'c1', name: 'Beverages', sortOrder: 2 },
        { id: 'c2', name: 'Starters', sortOrder: 0 },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('creates a category', async () => {
      const dto = { name: 'New Category', sortOrder: 5 };
      prismaMock.client.menuCategory.create.mockResolvedValue({
        id: 'new-id',
        ...dto,
      });

      const result = await service.create(dto);
      expect(result.name).toBe('New Category');
    });
  });

  describe('remove', () => {
    it('deletes a category', async () => {
      prismaMock.client.menuCategory.findUnique.mockResolvedValue({ id: 'category-uuid', name: 'Test' } as any);
      prismaMock.client.menuCategory.delete.mockResolvedValue({} as any);

      await expect(service.remove('category-uuid')).resolves.not.toThrow();
    });

    it('throws ConflictException when category has items', async () => {
      prismaMock.client.menuCategory.findUnique.mockResolvedValue({ id: 'category-uuid', name: 'Test' } as any);
      const prismaError: any = new Error('Foreign key constraint');
      prismaError.code = 'P2003';
      prismaError.clientVersion = '6.4.0';
      prismaMock.client.menuCategory.delete.mockRejectedValue(prismaError);

      await expect(service.remove('category-uuid')).rejects.toThrow(
        /unavailable/i
      );
    });
  });

  describe('sort', () => {
    it('updates sort order in a transaction', async () => {
      const ids = ['c1', 'c2', 'c3'];

      await service.sort(ids);

      expect(prismaMock.client.menuCategory.update).toHaveBeenCalledTimes(3);
      expect(prismaMock.client.menuCategory.update).toHaveBeenNthCalledWith(
        1, { where: { id: 'c1' }, data: { sortOrder: 0 } }
      );
      expect(prismaMock.client.menuCategory.update).toHaveBeenNthCalledWith(
        2, { where: { id: 'c2' }, data: { sortOrder: 1 } }
      );
      expect(prismaMock.client.menuCategory.update).toHaveBeenNthCalledWith(
        3, { where: { id: 'c3' }, data: { sortOrder: 2 } }
      );
    });
  });
});
