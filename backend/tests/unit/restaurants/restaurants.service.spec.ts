import { RestaurantsService } from '../../../../backend/src/restaurants/restaurants.service';
import { createMockPrismaService } from '../../mocks/prisma.mock';
import { createMockCloudinaryService } from '../../mocks/cloudinary.mock';
import { buildRestaurant, buildTable } from '../../factories/restaurant.factory';

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let prismaMock: ReturnType<typeof createMockPrismaService>;
  let cloudinaryMock: ReturnType<typeof createMockCloudinaryService>;

  beforeEach(() => {
    prismaMock = createMockPrismaService();
    cloudinaryMock = createMockCloudinaryService();
    service = new RestaurantsService(prismaMock as any, cloudinaryMock as any);
  });

  describe('getAllRestaurants', () => {
    it('returns all restaurants with settings', async () => {
      const restaurants = [buildRestaurant()];
      prismaMock.client.restaurant.findMany.mockResolvedValue(restaurants);

      const result = await service.getAllRestaurants();
      expect(result).toEqual(restaurants);
    });
  });

  describe('getRestaurantBySlug', () => {
    it('returns restaurant with settings', async () => {
      prismaMock.rawClient.restaurant.findUnique.mockResolvedValue(buildRestaurant());

      const result = await service.getRestaurantBySlug('tandoori-palace');
      expect(result).toBeDefined();
      expect(prismaMock.rawClient.restaurant.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: 'tandoori-palace' } })
      );
    });

    it('throws NotFoundError for non-existent slug', async () => {
      prismaMock.rawClient.restaurant.findUnique.mockResolvedValue(null);

      await expect(service.getRestaurantBySlug('nonexistent')).rejects.toThrow();
    });
  });

  describe('createRestaurant', () => {
    const createDto = {
      name: 'New Restaurant',
      slug: 'new-restaurant',
      ownerName: 'Owner',
      ownerEmail: 'owner@test.com',
    };

    it('creates a restaurant with default settings', async () => {
      prismaMock.client.restaurant.findUnique.mockResolvedValue(null);
      prismaMock.client.restaurant.create.mockResolvedValue(
        buildRestaurant({ name: 'New Restaurant', slug: 'new-restaurant' })
      );
      prismaMock.client.restaurantSetting.create.mockResolvedValue({});
      prismaMock.client.auditLog.create.mockResolvedValue({});

      const result = await service.createRestaurant(createDto);

      expect(prismaMock.client.restaurant.create).toHaveBeenCalled();
      expect(prismaMock.client.restaurantSetting.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cgstRate: 2.5,
            sgstRate: 2.5,
            serviceChargeRate: 5.0,
          }),
        })
      );
    });

    it('throws on duplicate slug', async () => {
      prismaMock.client.restaurant.findUnique.mockResolvedValue(buildRestaurant());

      await expect(service.createRestaurant(createDto)).rejects.toThrow();
    });
  });

  describe('getMenu', () => {
    it('returns menu with categories and items', async () => {
      prismaMock.rawClient.restaurant.findUnique
        .mockResolvedValueOnce(buildRestaurant())
        .mockResolvedValueOnce(buildRestaurant());
      prismaMock.rawClient.restaurantSetting.findUnique.mockResolvedValue(
        buildRestaurant().settings
      );
      prismaMock.rawClient.menuCategory.findMany.mockResolvedValue([
        {
          id: 'cat-uuid',
          name: 'Starters',
          menuItems: [
            {
              id: 'item-uuid',
              name: 'Paneer Tikka',
              price: 250,
              isVeg: true,
              variants: [],
              addons: [],
            },
          ],
        },
      ]);

      const result = await service.getMenu('tandoori-palace');

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });

  describe('updateRestaurantSettings', () => {
    it('updates tax rates', async () => {
      prismaMock.client.restaurantSetting.findUnique.mockResolvedValue(
        buildRestaurant().settings
      );
      prismaMock.client.restaurantSetting.update.mockResolvedValue({});

      await service.updateRestaurantSettings('restaurant-uuid', {
        cgstRate: 5.0,
        sgstRate: 5.0,
        serviceChargeRate: 10.0,
        allowedFoodTypes: ['VEG'],
      });

      expect(prismaMock.client.restaurantSetting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cgstRate: 5.0,
            sgstRate: 5.0,
          }),
        })
      );
    });

    it('throws when allowedFoodTypes is empty', async () => {
      await expect(
        service.updateRestaurantSettings('restaurant-uuid', {
          allowedFoodTypes: [],
        })
      ).rejects.toThrow();
    });
  });

  describe('createTable', () => {
    it('creates a table when under limit', async () => {
      prismaMock.client.restaurant.findUnique.mockResolvedValue(
        buildRestaurant({ _count: { tables: 5 } })
      );
      prismaMock.client.table.findFirst.mockResolvedValue(null);
      prismaMock.client.table.count.mockResolvedValue(5);
      prismaMock.client.table.create.mockResolvedValue(buildTable());

      const result = await service.createTable('restaurant-uuid', 'T4');

      expect(result).toBeDefined();
      expect(prismaMock.client.table.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'T4' }),
        })
      );
    });

    it('throws when table limit exceeded', async () => {
      prismaMock.client.restaurant.findUnique.mockResolvedValue(
        buildRestaurant({ maxTables: 10, _count: { tables: 10 } })
      );
      prismaMock.client.table.count.mockResolvedValue(10);

      await expect(
        service.createTable('restaurant-uuid', 'T11')
      ).rejects.toThrow('Table limit');
    });

    it('throws on duplicate table name', async () => {
      prismaMock.client.restaurant.findUnique.mockResolvedValue(
        buildRestaurant({ _count: { tables: 5 } })
      );
      prismaMock.client.table.count.mockResolvedValue(5);
      prismaMock.client.table.findUnique.mockResolvedValue(buildTable());

      await expect(
        service.createTable('restaurant-uuid', 'T1')
      ).rejects.toThrow('already exists');
    });
  });
});
