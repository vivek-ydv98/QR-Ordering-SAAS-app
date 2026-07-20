import { tenantContextStore } from '../../../../backend/src/common/middleware/tenant.middleware';

describe('PrismaService tenant scoping', () => {
  it('exports tenantContextStore as AsyncLocalStorage', () => {
    expect(tenantContextStore).toBeDefined();
    expect(typeof tenantContextStore.getStore).toBe('function');
    expect(typeof tenantContextStore.run).toBe('function');
  });

  it('stores and retrieves tenant ID', () => {
    const testTenantId = 'test-tenant-uuid';
    tenantContextStore.run(testTenantId, () => {
      expect(tenantContextStore.getStore()).toBe(testTenantId);
    });
  });

  it('returns undefined outside of context', () => {
    expect(tenantContextStore.getStore()).toBeUndefined();
  });

  it('isolates nested contexts', () => {
    const outer = 'outer-tenant';
    const inner = 'inner-tenant';

    tenantContextStore.run(outer, () => {
      expect(tenantContextStore.getStore()).toBe(outer);

      tenantContextStore.run(inner, () => {
        expect(tenantContextStore.getStore()).toBe(inner);
      });

      expect(tenantContextStore.getStore()).toBe(outer);
    });
  });
});
