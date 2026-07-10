import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NotFoundError, ValidationError } from '../common/errors/app-error';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createRestaurantAdmin(restaurantId: string, createUserDto: CreateUserDto) {
    // 1. Verify restaurant exists
    const restaurant = await this.prisma.client.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundError(`Restaurant with ID "${restaurantId}" not found`);
    }

    // 2. Check if email is unique
    const existingUser = await this.prisma.client.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ValidationError('Email address is already registered', 'email');
    }

    // 3. Generate temporary password if not provided
    const tempPassword = createUserDto.password || 'Password123';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // 4. Create the User
    const user = await this.prisma.client.user.create({
      data: {
        restaurantId,
        fullName: createUserDto.fullName,
        email: createUserDto.email,
        passwordHash,
        role: createUserDto.role || 'RESTAURANT_ADMIN',
        isActive: true,
      },
    });

    // 5. Create Staff entry (for backwards compatibility with existing schema relations)
    // Find or create the corresponding Role
    let roleName = user.role;
    let dbRole = await this.prisma.client.role.findFirst({
      where: { name: roleName },
    });

    if (!dbRole) {
      dbRole = await this.prisma.client.role.create({
        data: { name: roleName },
      });
    }

    await this.prisma.client.staff.create({
      data: {
        restaurantId,
        userId: user.id,
        roleId: dbRole.id,
        isAvailable: true,
      },
    });

    // 6. Log audit
    await this.prisma.client.auditLog.create({
      data: {
        restaurantId,
        userId: user.id,
        action: 'CREATE_USER',
        details: `Created user ${user.fullName} (${user.role}) for restaurant ID ${restaurantId}.`,
      },
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        isActive: user.isActive,
      },
      temporaryPassword: tempPassword,
    };
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError(`User with ID "${userId}" not found`);
    }

    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        email: updateUserDto.email,
        fullName: updateUserDto.fullName,
        role: updateUserDto.role,
        isActive: updateUserDto.isActive,
      },
    });

    // Log audit
    await this.prisma.client.auditLog.create({
      data: {
        restaurantId: updatedUser.restaurantId,
        userId: updatedUser.id,
        action: 'UPDATE_USER',
        details: `Updated user details for ${updatedUser.fullName}.`,
      },
    });

    return {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      role: updatedUser.role,
      restaurantId: updatedUser.restaurantId,
      isActive: updatedUser.isActive,
    };
  }

  async resetPassword(userId: string, explicitPassword?: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError(`User with ID "${userId}" not found`);
    }

    const tempPassword = explicitPassword || randomBytes(12).toString('base64url');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    await this.prisma.client.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Log audit
    await this.prisma.client.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        action: 'RESET_PASSWORD',
        details: `Reset password for user ${user.fullName} (${user.email}).`,
      },
    });

    return {
      success: true,
      temporaryPassword: tempPassword,
    };
  }

  async getAuditLogs() {
    return this.prisma.client.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true,
          },
        },
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    });
  }
}
