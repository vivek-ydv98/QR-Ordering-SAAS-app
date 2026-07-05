import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    // Staff model is tenant-scoped, so prisma.client.staff will automatically filter by restaurantId
    return this.prisma.client.staff.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async create(createStaffDto: CreateStaffDto) {
    const { email, fullName, role, password, isAvailable } = createStaffDto;

    // 1. Verify email is unique globally (User is not tenant-scoped, so query rawClient)
    const existingUser = await this.prisma.rawClient.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email address is already registered');
    }

    // 2. Generate/hash password
    const tempPassword = password || 'Password123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // Get current tenantId from local storage context (bound by TenantMiddleware)
    // Staff is tenant-scoped, but User creation needs explicit restaurantId
    const tenantId = this.prisma.client.$extends.extArgs?.query?.$allModels?.$allOperations?.name === 'tenantContextStore' 
      ? null 
      : require('../common/middleware/tenant.middleware').tenantContextStore.getStore();

    if (!tenantId) {
      throw new BadRequestException('Tenant context not established. Cannot create staff.');
    }

    // 3. Find or create the Role in database
    let dbRole = await this.prisma.rawClient.role.findFirst({
      where: { name: role },
    });

    if (!dbRole) {
      dbRole = await this.prisma.rawClient.role.create({
        data: { name: role },
      });
    }

    // 4. Create User and Staff inside a transaction
    const result = await this.prisma.rawClient.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          restaurantId: tenantId,
          fullName,
          email,
          passwordHash,
          role,
          isActive: true,
        },
      });

      const staff = await tx.staff.create({
        data: {
          restaurantId: tenantId,
          userId: user.id,
          roleId: dbRole.id,
          isAvailable: isAvailable ?? true,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          restaurantId: tenantId,
          userId: user.id,
          action: 'CREATE_STAFF',
          details: `Created staff member ${fullName} (${role}).`,
        },
      });

      return staff;
    });

    return {
      staff: result,
      temporaryPassword: password ? null : tempPassword,
    };
  }

  async update(id: string, updateStaffDto: UpdateStaffDto) {
    const { email, fullName, role, isActive, isAvailable } = updateStaffDto;

    // 1. Find the Staff record (automatically filtered by tenantId)
    const staff = await this.prisma.client.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!staff) {
      throw new NotFoundException(`Staff record with ID "${id}" not found`);
    }

    const userId = staff.userId;

    // 2. Validate email uniqueness if changing email
    if (email && email !== staff.user.email) {
      const existingUser = await this.prisma.rawClient.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new BadRequestException('Email address is already registered');
      }
    }

    // 3. Resolve role in database if changing role
    let newDbRoleId: string | undefined;
    if (role) {
      let dbRole = await this.prisma.rawClient.role.findFirst({
        where: { name: role },
      });

      if (!dbRole) {
        dbRole = await this.prisma.rawClient.role.create({
          data: { name: role },
        });
      }
      newDbRoleId = dbRole.id;
    }

    // 4. Update inside transaction
    const updatedStaff = await this.prisma.rawClient.$transaction(async (tx) => {
      // Update User details
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(email && { email }),
          ...(fullName && { fullName }),
          ...(role && { role }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      // Update Staff details
      const result = await tx.staff.update({
        where: { id },
        data: {
          ...(isAvailable !== undefined && { isAvailable }),
          ...(newDbRoleId && { roleId: newDbRoleId }),
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          restaurantId: staff.restaurantId,
          userId: staff.userId,
          action: 'UPDATE_STAFF',
          details: `Updated details for staff member ${fullName || staff.user.fullName}.`,
        },
      });

      return result;
    });

    return updatedStaff;
  }

  async resetPassword(id: string, explicitPassword?: string) {
    const staff = await this.prisma.client.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!staff) {
      throw new NotFoundException(`Staff record with ID "${id}" not found`);
    }

    const tempPassword = explicitPassword || 'Password123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    await this.prisma.rawClient.user.update({
      where: { id: staff.userId },
      data: { passwordHash },
    });

    // Log audit
    await this.prisma.client.auditLog.create({
      data: {
        userId: staff.userId,
        action: 'RESET_PASSWORD',
        details: `Reset password for staff member ${staff.user.fullName}.`,
      },
    });

    return {
      success: true,
      temporaryPassword: explicitPassword ? null : tempPassword,
    };
  }

  async getActivity(id: string) {
    const staff = await this.prisma.client.staff.findUnique({
      where: { id },
    });

    if (!staff) {
      throw new NotFoundException(`Staff record with ID "${id}" not found`);
    }

    // Fetch login/logout audit logs for this specific staff user
    return this.prisma.client.auditLog.findMany({
      where: {
        userId: staff.userId,
        action: {
          in: ['USER_LOGIN', 'USER_LOGOUT'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.rawClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        restaurantId: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return user;
  }

  async updateProfile(userId: string, data: { fullName?: string; email?: string; password?: string }) {
    const { fullName, email, password } = data;

    const user = await this.prisma.rawClient.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    if (email && email !== user.email) {
      const existingUser = await this.prisma.rawClient.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new BadRequestException('Email address is already registered');
      }
    }

    let passwordHash: string | undefined;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await this.prisma.rawClient.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(passwordHash && { passwordHash }),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        restaurantId: true,
        isActive: true,
      },
    });

    // Log audit
    await this.prisma.rawClient.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        action: 'UPDATE_PROFILE',
        details: `User ${updatedUser.fullName} updated their profile settings.`,
      },
    });

    return updatedUser;
  }
}
