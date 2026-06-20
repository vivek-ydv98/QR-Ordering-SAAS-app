import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Find user by email
    const user = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Validate password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Verify user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Your account is deactivated');
    }

    // 4. Verify restaurant is active (if staff/admin user)
    if (user.restaurantId) {
      const restaurant = await this.prisma.client.restaurant.findUnique({
        where: { id: user.restaurantId },
      });

      if (!restaurant) {
        throw new UnauthorizedException('Restaurant association not found');
      }

      if (!restaurant.isActive) {
        throw new ForbiddenException(
          'Your restaurant account is suspended. Please contact the platform support.'
        );
      }
    }

    // 5. Update last login time
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 6. Generate access and refresh tokens
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_EXPIRATION') || '15m') as any,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '7d',
      },
    );

    // 7. Write audit log
    await this.prisma.client.auditLog.create({
      data: {
        restaurantId: user.restaurantId,
        userId: user.id,
        action: 'USER_LOGIN',
        details: `User ${user.fullName} (${user.role}) successfully logged in.`,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        restaurantId: user.restaurantId,
      },
    };
  }

  async refresh(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;

      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User is inactive or no longer exists');
      }

      // Verify tenant status
      if (user.restaurantId) {
        const restaurant = await this.prisma.client.restaurant.findUnique({
          where: { id: user.restaurantId },
        });

        if (!restaurant || !restaurant.isActive) {
          throw new ForbiddenException('Restaurant is inactive');
        }
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_EXPIRATION') || '15m') as any,
      });

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          restaurantId: user.restaurantId,
        },
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    // Audit log logout
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      await this.prisma.client.auditLog.create({
        data: {
          restaurantId: user.restaurantId,
          userId: user.id,
          action: 'USER_LOGOUT',
          details: `User ${user.fullName} logged out.`,
        },
      });
    }

    return { success: true };
  }
}
