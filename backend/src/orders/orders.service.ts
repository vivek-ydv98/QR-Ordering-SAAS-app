import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStateMachine } from './orders.state';
import { OrderStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../common/errors/app-error';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Place a new order with real-time tax calculation
   */
  async createOrder(
    tableId: string,
    items: Array<{ menuItemId: string; quantity: number; customizations?: any[] }>,
    specialInstructions?: string
  ) {
    // 1. Verify that the table is valid, active, and vacant/occupied
    const table = await this.prisma.client.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      throw new NotFoundError('Dining table not found.');
    }
    if (table.isActive === false) {
      throw new ValidationError('Dining table is currently deactivated and cannot accept orders.', 'tableId');
    }

    // 2. Fetch all menu items referenced in the request
    const menuItemIds = items.map((i) => i.menuItemId);
    const dbMenuItems = await this.prisma.client.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    if (dbMenuItems.length !== items.length) {
      throw new ValidationError('Some selected items are no longer available in the menu catalog.', 'items');
    }

    // 3. Retrieve active taxation settings for the restaurant
    const settings = await this.prisma.client.restaurantSetting.findUnique({
      where: { restaurantId: table.restaurantId },
    });
    const cgstRate = settings && settings.cgstRate !== null ? Number(settings.cgstRate) : null;
    const sgstRate = settings && settings.sgstRate !== null ? Number(settings.sgstRate) : null;
    const serviceChargeRate = settings && settings.serviceChargeRate !== null ? Number(settings.serviceChargeRate) : null;

    // 4. Calculate prices
    let subtotal = 0;
    const itemsData = items.map((clientItem) => {
      const dbItem = dbMenuItems.find((m) => m.id === clientItem.menuItemId)!;
      const basePrice = Number(dbItem.price);

      // Calculate customizations price if any options are selected
      const customPrice = clientItem.customizations
        ? clientItem.customizations.reduce((acc, opt) => acc + (opt.price || 0), 0)
        : 0;

      const itemTotal = (basePrice + customPrice) * clientItem.quantity;
      subtotal += itemTotal;

      return {
        menuItemId: dbItem.id,
        name: dbItem.name,
        quantity: clientItem.quantity,
        price: basePrice + customPrice,
        customizations: clientItem.customizations || [],
      };
    });

    const cgst = cgstRate !== null ? subtotal * (cgstRate / 100) : null;
    const sgst = sgstRate !== null ? subtotal * (sgstRate / 100) : null;
    const serviceCharge = serviceChargeRate !== null ? subtotal * (serviceChargeRate / 100) : null;
    const grandTotal = subtotal + (cgst ?? 0) + (sgst ?? 0) + (serviceCharge ?? 0);

    // Generate KOT serial number
    const todayOrdersCount = await this.prisma.client.order.count();
    const kotNumber = `#${(1001 + todayOrdersCount).toString()}`;

    // 5. Save order inside transaction block
    return this.prisma.client.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          tableId,
          restaurantId: table.restaurantId,
          kotNumber,
          status: 'pending',
          subtotal,
          cgst,
          sgst,
          serviceCharge,
          cgstRate,
          sgstRate,
          serviceChargeRate,
          grandTotal,
          specialInstructions,
          items: {
            create: itemsData,
          },
        },
        include: {
          items: true,
          table: true,
        },
      });

      // Update table occupancy status
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });

      // Automatically schedule a KDS ticket
      await tx.kitchenTicket.create({
        data: {
          orderId: order.id,
          restaurantId: table.restaurantId,
          kotNumber,
          status: 'pending',
        },
      });

      return order;
    });
  }

  /**
   * Update status of an existing order enforcing lifecycle rules
   */
  async updateOrderStatus(orderId: string, targetStatus: OrderStatus, userRole?: string) {
    const order = await this.prisma.client.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError('Requested order record not found.');
    }

    // Enforce role-based access control (RBAC) on transitions
    if (userRole) {
      if (userRole === 'KITCHEN_STAFF') {
        const allowedKitchenStatuses: OrderStatus[] = ['confirmed', 'preparing', 'ready', 'served'];
        if (!allowedKitchenStatuses.includes(targetStatus)) {
          throw new ForbiddenException(
            `Access denied. Kitchen Staff cannot transition orders to "${targetStatus}".`
          );
        }
      } else if (userRole === 'WAITER') {
        const allowedWaiterStatuses: OrderStatus[] = ['served'];
        if (!allowedWaiterStatuses.includes(targetStatus)) {
          throw new ForbiddenException(
            `Access denied. Waiters cannot transition orders to "${targetStatus}".`
          );
        }
      } else if (userRole === 'CASHIER') {
        const allowedCashierStatuses: OrderStatus[] = ['served', 'completed'];
        if (!allowedCashierStatuses.includes(targetStatus)) {
          throw new ForbiddenException(
            `Access denied. Cashiers cannot transition orders to "${targetStatus}".`
          );
        }
      }
    }

    // Enforce Finite State Machine transitions
    OrderStateMachine.validateTransition(order.status, targetStatus);

    return this.prisma.client.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: targetStatus },
        include: { items: true },
      });

      // Sync changes to KDS tickets
      await tx.kitchenTicket.updateMany({
        where: { orderId },
        data: { status: targetStatus },
      });

      // If order is completed or cancelled, release the dining table status
      if (targetStatus === 'completed' || targetStatus === 'cancelled') {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'VACANT', activeSessionId: null },
        });
      }

      return updatedOrder;
    });
  }

  /**
   * Retrieve active KOT tickets for staff dashboards
   */
  async getActiveOrders(restaurantId?: string) {
    return this.prisma.client.order.findMany({
      where: {
        status: { in: ['pending', 'confirmed', 'preparing', 'ready', 'served'] },
        ...(restaurantId ? { restaurantId } : {}),
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                isVeg: true,
              },
            },
          },
        },
        table: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Fetch real-time dashboard stats for a restaurant
   */
  async getDashboardStats(restaurantId: string) {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required to fetch statistics.', 'restaurantId');
    }

    // Today's local date range boundary (start of day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Calculate today's revenue (sum of non-cancelled orders)
    const todayOrders = await this.prisma.client.order.findMany({
      where: {
        restaurantId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          not: 'cancelled',
        },
      },
      select: {
        grandTotal: true,
      },
    });

    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.grandTotal), 0);

    // 2. Count active/live orders (KOTs)
    const liveKots = await this.prisma.client.order.count({
      where: {
        restaurantId,
        status: {
          in: ['pending', 'confirmed', 'preparing', 'ready'],
        },
      },
    });

    // 3. Table Occupancy: Occupied vs Total Tables
    const totalTables = await this.prisma.client.table.count({
      where: {
        restaurantId,
        isActive: true,
      },
    });

    const occupiedTables = await this.prisma.client.table.count({
      where: {
        restaurantId,
        status: 'OCCUPIED',
        isActive: true,
      },
    });

    // 4. Avg. Prep Speed (average time to complete/serve in minutes)
    const tickets = await this.prisma.client.kitchenTicket.findMany({
      where: {
        restaurantId,
        status: {
          in: ['ready', 'served', 'completed'],
        },
        createdAt: {
          gte: todayStart,
        },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    let totalDuration = 0;
    let ticketCount = 0;

    for (const ticket of tickets) {
      const diffMs = ticket.updatedAt.getTime() - ticket.createdAt.getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins >= 0) {
        totalDuration += diffMins;
        ticketCount++;
      }
    }

    const avgPrepSpeed = ticketCount > 0 ? Math.round(totalDuration / ticketCount) : 15;

    return {
      todayRevenue,
      liveKots,
      tableOccupancy: {
        occupied: occupiedTables,
        total: totalTables,
      },
      avgPrepSpeed,
    };
  }

  async getCompletedOrdersToday(restaurantId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    return this.prisma.client.order.findMany({
      where: {
        restaurantId,
        status: 'completed',
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                isVeg: true,
              },
            },
          },
        },
        table: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }
}
