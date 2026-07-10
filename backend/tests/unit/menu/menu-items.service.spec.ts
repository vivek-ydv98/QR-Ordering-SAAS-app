import { MenuItemsService } from '../../../../backend/src/menu/services/menu-items.service';
import { createMockPrismaService } from '../../mocks/prisma.mock';
import { createMockCloudinaryService } from '../../mocks/cloudinary.mock';

describe('MenuItemsService', () => {
  let service: MenuItemsService;
  let prismaMock: ReturnType<typeof createMockPrismaService>;
  let cloudinaryMock: ReturnType<typeof createMockCloudinaryService>;

  beforeEach(() => {
    prismaMock = createMockPrismaService();
    cloudinaryMock = createMockCloudinaryService();
    service = new MenuItemsService(prismaMock as any, cloudinaryMock as any);
  });

  describe('findAll', () => {
    it('returns all menu items', async () => {
      prismaMock.client.menuItem.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Paneer Tikka', isVeg: true, variants: [], addons: [] },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('filters by categoryId when provided', async () => {
      prismaMock.client.menuItem.findMany.mockResolvedValue([]);

      await service.findAll('category-uuid');

      expect(prismaMock.client.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'category-uuid' }),
        })
      );
    });
  });

  describe('create', () => {
    it('creates a menu item with food type validation', async () => {
      const dto = {
        categoryId: 'category-uuid',
        name: 'New Item',
        description: 'Desc',
        price: 199,
        foodType: 'VEG' as const,
      };

      prismaMock.client.menuCategory.findUnique.mockResolvedValue({
        id: 'category-uuid',
        restaurantId: 'restaurant-uuid',
      });
      prismaMock.client.restaurantSetting.findFirst.mockResolvedValue({
        allowedFoodTypes: ['VEG', 'NON_VEG'],
      });
      prismaMock.client.menuItem.create.mockResolvedValue({
        id: 'new-item',
        ...dto,
        variants: [],
        addons: [],
      });

      const result = await service.create(dto);
      expect(result).toBeDefined();
    });

    it('throws when food type is not allowed', async () => {
      const dto = {
        categoryId: 'category-uuid',
        name: 'Pork Dish',
        description: 'Not allowed',
        price: 299,
        foodType: 'NON_VEG' as const,
      };

      prismaMock.client.menuCategory.findUnique.mockResolvedValue({
        id: 'category-uuid',
        restaurantId: 'restaurant-uuid',
      });
      prismaMock.client.restaurantSetting.findFirst.mockResolvedValue({
        allowedFoodTypes: ['VEG'],
      });

      await expect(service.create(dto)).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('returns item when food type is allowed', async () => {
      prismaMock.client.menuItem.findUnique.mockResolvedValue({
        id: 'item-uuid',
        name: 'Paneer Tikka',
        foodType: 'VEG',
        isVeg: true,
        variants: [],
        addons: [],
        category: { name: 'Starters' },
      });
      prismaMock.client.restaurantSetting.findFirst.mockResolvedValue({
        allowedFoodTypes: ['VEG', 'NON_VEG'],
      });

      const result = await service.findOne('item-uuid');
      expect(result).toBeDefined();
    });

    it('hides item when food type is not allowed', async () => {
      prismaMock.client.menuItem.findUnique.mockResolvedValue({
        id: 'item-uuid',
        name: 'Chicken Curry',
        foodType: 'NON_VEG',
        variants: [],
        addons: [],
        category: { name: 'Main Course' },
      });
      prismaMock.client.restaurantSetting.findFirst.mockResolvedValue({
        allowedFoodTypes: ['VEG'],
      });

      await expect(service.findOne('item-uuid')).rejects.toThrow();
    });
  });
});
