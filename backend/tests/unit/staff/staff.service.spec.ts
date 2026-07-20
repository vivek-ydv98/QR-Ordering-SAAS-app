import { StaffService } from '../../../../backend/src/staff/staff.service';
import { createMockPrismaService } from '../../mocks/prisma.mock';

jest.mock('../../../../backend/src/common/middleware/tenant.middleware', () => ({
  tenantContextStore: {
    getStore: jest.fn(() => 'restaurant-uuid'),
  },
}));

describe('StaffService', () => {
  let service: StaffService;
  let prismaMock: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prismaMock = createMockPrismaService();
    service = new StaffService(prismaMock as any);
  });

  describe('findAll', () => {
    it('returns all staff for the tenant', async () => {
      prismaMock.client.staff.findMany.mockResolvedValue([
        {
          id: 'staff-uuid',
          user: {
            id: 'user-uuid',
            fullName: 'John',
            email: 'john@test.com',
            role: 'WAITER',
            isActive: true,
            lastLoginAt: null,
          },
          role: { id: 'role-uuid', name: 'WAITER' },
          isAvailable: true,
        },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(prismaMock.client.staff.findMany).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const createDto = {
      email: 'new@staff.com',
      fullName: 'New Staff',
      role: 'WAITER',
    };

    it('creates staff with user record', async () => {
      prismaMock.client.user.findFirst.mockResolvedValue(null);
      prismaMock.client.role.findFirst.mockResolvedValue(null);
      prismaMock.client.role.create.mockResolvedValue({
        id: 'role-uuid',
        name: 'WAITER',
      });
      prismaMock.rawClient.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue({ id: 'new-user-uuid' }) },
          staff: { create: jest.fn().mockResolvedValue({ id: 'new-staff-uuid' }) },
          auditLog: { create: jest.fn() },
        };
        return cb(tx);
      });

      const result = await service.create(createDto);
      expect(result).toBeDefined();
    });

    it('throws on duplicate email', async () => {
      prismaMock.client.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        email: 'new@staff.com',
      });

      await expect(service.create(createDto)).rejects.toThrow();
    });
  });
});
