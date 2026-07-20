import { OrdersService } from '../../../../backend/src/orders/orders.service';
import { createMockPrismaService, mockRestaurantSettings } from '../../mocks/prisma.mock';
import { buildOrder, buildOrderItem, buildKitchenTicket } from '../../factories/order.factory';
import { buildTable } from '../../factories/restaurant.factory';

describe('OrdersService', () => {
  let ordersService: OrdersService;
  let prismaMock: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prismaMock = createMockPrismaService();
    ordersService = new OrdersService(prismaMock as any);
  });

  describe('createOrder', () => {
    const createDto = {
      tableId: 'table-uuid',
      items: [{ menuItemId: 'menu-item-uuid', quantity: 2 }],
    };

    it('creates an order with calculated taxes', async () => {
      prismaMock.client.table.findUnique.mockResolvedValue(buildTable());
      prismaMock.client.menuItem.findMany.mockResolvedValue([
        { id: 'menu-item-uuid', price: 250, isVeg: true },
      ]);
      prismaMock.client.restaurantSetting.findFirst.mockResolvedValue(mockRestaurantSettings);
      prismaMock.client.order.count.mockResolvedValue(0);
      prismaMock.client.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          order: {
            create: jest.fn().mockResolvedValue(
              buildOrder({ items: [buildOrderItem()] })
            ),
          },
          table: { update: jest.fn() },
          kitchenTicket: { create: jest.fn().mockResolvedValue(buildKitchenTicket()) },
        };
        return cb(tx);
      });

      const result = await ordersService.createOrder(createDto.tableId, createDto.items);

      expect(result).toBeDefined();
      expect(prismaMock.client.table.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'table-uuid' } })
      );
    });

    it('throws when table is inactive', async () => {
      prismaMock.client.table.findUnique.mockResolvedValue(
        buildTable({ isActive: false })
      );

      await expect(
        ordersService.createOrder(createDto.tableId, createDto.items)
      ).rejects.toThrow();
    });

    it('throws when table not found', async () => {
      prismaMock.client.table.findUnique.mockResolvedValue(null);

      await expect(
        ordersService.createOrder(createDto.tableId, createDto.items)
      ).rejects.toThrow();
    });

    it('calculates subtotal correctly with customizations', async () => {
      prismaMock.client.table.findUnique.mockResolvedValue(buildTable());
      prismaMock.client.menuItem.findMany.mockResolvedValue([
        { id: 'menu-item-uuid', price: 200, isVeg: true },
      ]);
      prismaMock.client.restaurantSetting.findFirst.mockResolvedValue(mockRestaurantSettings);
      prismaMock.client.order.count.mockResolvedValue(5);

      const itemsWithCustomization = [
        {
          menuItemId: 'menu-item-uuid',
          quantity: 3,
          customizations: [{ optionName: 'Extra cheese', price: 30 }],
        },
      ];

      let capturedCreateData: any;
      prismaMock.client.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          order: {
            create: jest.fn().mockImplementation(({ data }: any) => {
              capturedCreateData = data;
              return buildOrder();
            }),
          },
          table: { update: jest.fn() },
          kitchenTicket: { create: jest.fn().mockResolvedValue(buildKitchenTicket()) },
        };
        return cb(tx);
      });

      await ordersService.createOrder(createDto.tableId, itemsWithCustomization);

      const baseItemPrice = 200;
      const customizationPrice = 30;
      const itemTotal = (baseItemPrice + customizationPrice) * 3;
      expect(capturedCreateData.subtotal).toBe(itemTotal);
    });
  });

  describe('updateOrderStatus', () => {
    it('updates status to confirmed', async () => {
      const order = buildOrder({ status: 'pending' });
      prismaMock.client.order.findUnique.mockResolvedValue(order);
      prismaMock.client.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          order: { update: jest.fn().mockResolvedValue(buildOrder({ status: 'confirmed' })) },
          kitchenTicket: { update: jest.fn(), updateMany: jest.fn() },
          table: { update: jest.fn() },
        };
        return cb(tx);
      });

      const result = await ordersService.updateOrderStatus('order-uuid', 'confirmed', 'ADMIN');
      expect(result).toBeDefined();
    });

    it('throws on invalid transition', async () => {
      prismaMock.client.order.findUnique.mockResolvedValue(
        buildOrder({ status: 'pending' })
      );

      await expect(
        ordersService.updateOrderStatus('order-uuid', 'ready', 'ADMIN')
      ).rejects.toThrow();
    });

    it('throws when order not found', async () => {
      prismaMock.client.order.findUnique.mockResolvedValue(null);

      await expect(
        ordersService.updateOrderStatus('nonexistent', 'confirmed', 'ADMIN')
      ).rejects.toThrow();
    });

    it('enforces KITCHEN_STAFF role restrictions', async () => {
      prismaMock.client.order.findUnique.mockResolvedValue(
        buildOrder({ status: 'pending' })
      );

      await expect(
        ordersService.updateOrderStatus('order-uuid', 'completed', 'KITCHEN_STAFF')
      ).rejects.toThrow();
    });

    it('enforces WAITER role restrictions', async () => {
      prismaMock.client.order.findUnique.mockResolvedValue(
        buildOrder({ status: 'ready' })
      );

      await expect(
        ordersService.updateOrderStatus('order-uuid', 'completed', 'WAITER')
      ).rejects.toThrow();
    });

    it('sets table to VACANT on completion', async () => {
      prismaMock.client.order.findUnique.mockResolvedValue(
        buildOrder({ status: 'served' })
      );

      let updatedTable: any;
      prismaMock.client.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          order: { update: jest.fn().mockResolvedValue(buildOrder({ status: 'completed' })) },
          kitchenTicket: { update: jest.fn(), updateMany: jest.fn() },
          table: {
            update: jest.fn().mockImplementation(({ where, data }: any) => {
              updatedTable = data;
              return buildTable({ status: 'VACANT' });
            }),
          },
        };
        return cb(tx);
      });

      await ordersService.updateOrderStatus('order-uuid', 'completed', 'CASHIER');
      expect(updatedTable).toEqual(
        expect.objectContaining({ status: 'VACANT', activeSessionId: null })
      );
    });
  });

  describe('getActiveOrders', () => {
    it('returns orders with non-terminal statuses', async () => {
      const orders = [
        buildOrder({ status: 'pending' }),
        buildOrder({ status: 'confirmed' }),
        buildOrder({ status: 'preparing' }),
        buildOrder({ status: 'ready' }),
        buildOrder({ status: 'served' }),
      ];
      prismaMock.client.order.findMany.mockResolvedValue(orders);

      const result = await ordersService.getActiveOrders();

      expect(result).toHaveLength(5);
      expect(prismaMock.client.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
          }),
        })
      );
    });

    it('excludes completed and cancelled orders', async () => {
      prismaMock.client.order.findMany.mockResolvedValue([]);

      await ordersService.getActiveOrders();

      const callArg = prismaMock.client.order.findMany.mock.calls[0][0];
      expect(callArg.where.status.in).not.toContain('completed');
      expect(callArg.where.status.in).not.toContain('cancelled');
    });
  });

  describe('getDashboardStats', () => {
    it('returns stats with correct shape', async () => {
      prismaMock.client.order.findMany.mockResolvedValue([{ grandTotal: 5000 }]);
      prismaMock.client.order.count.mockResolvedValue(3);
      prismaMock.client.table.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(4);
      prismaMock.client.kitchenTicket.findMany.mockResolvedValue([
        { updatedAt: new Date(), createdAt: new Date(Date.now() - 600000) },
      ]);

      const stats = await ordersService.getDashboardStats('restaurant-uuid');

      expect(stats).toHaveProperty('todayRevenue');
      expect(stats).toHaveProperty('liveKots');
      expect(stats).toHaveProperty('tableOccupancy');
      expect(stats.tableOccupancy).toHaveProperty('occupied');
      expect(stats.tableOccupancy).toHaveProperty('total');
      expect(stats).toHaveProperty('avgPrepSpeed');
    });

    it('returns zero revenue when no orders', async () => {
      prismaMock.client.order.findMany.mockResolvedValue([]);
      prismaMock.client.order.count.mockResolvedValue(0);
      prismaMock.client.table.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      prismaMock.client.kitchenTicket.findMany.mockResolvedValue([]);

      const stats = await ordersService.getDashboardStats('restaurant-uuid');

      expect(stats.todayRevenue).toBe(0);
    });

    it('returns 15 min default avgPrepSpeed when no tickets', async () => {
      prismaMock.client.order.findMany.mockResolvedValue([{ grandTotal: 0 }]);
      prismaMock.client.order.count.mockResolvedValue(0);
      prismaMock.client.table.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      prismaMock.client.kitchenTicket.findMany.mockResolvedValue([]);

      const stats = await ordersService.getDashboardStats('restaurant-uuid');
      expect(stats.avgPrepSpeed).toBe(15);
    });

    it('throws ValidationError when restaurantId is missing', async () => {
      await expect(ordersService.getDashboardStats('')).rejects.toThrow();
    });
  });

  describe('getCompletedOrdersToday', () => {
    it('queries with 7-day window', async () => {
      prismaMock.client.order.findMany.mockResolvedValue([]);

      await ordersService.getCompletedOrdersToday('restaurant-uuid');

      const callArg = prismaMock.client.order.findMany.mock.calls[0][0];
      expect(callArg.where.status).toBe('completed');
      expect(callArg.where.createdAt).toHaveProperty('gte');
    });
  });
});
