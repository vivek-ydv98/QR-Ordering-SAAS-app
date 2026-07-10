export const createMockPrismaService = () => {
  const mockPrismaClient = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    orderItem: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    restaurant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    restaurantSetting: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    table: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    menuCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    menuItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    menuVariant: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    menuAddon: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    kitchenTicket: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    staff: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => {
      if (typeof fn === 'function') return fn(mockPrismaClient);
      if (Array.isArray(fn)) return Promise.all(fn);
      return Promise.resolve(fn);
    }),
  };

  const mockClientWithExtends = {
    ...mockPrismaClient,
    $extends: {
      extArgs: {
        query: {
          $allModels: {
            $allOperations: {
              name: '__mocked__',
            },
          },
        },
      },
    },
  };

  return {
    client: mockClientWithExtends,
    rawClient: mockPrismaClient,
  };
};

export const mockRestaurantSettings = {
  cgstRate: 2.5,
  sgstRate: 2.5,
  serviceChargeRate: 5.0,
  allowedFoodTypes: ['VEG', 'NON_VEG', 'EGG'],
  isVegOnly: false,
};
