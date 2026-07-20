import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../../backend/src/auth/auth.service';
import { PrismaService } from '../../../../backend/src/prisma/prisma.service';
import { createMockPrismaService } from '../../mocks/prisma.mock';
import { buildUser, buildSuperAdmin } from '../../factories/user.factory';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: ReturnType<typeof createMockPrismaService>;
  let jwtService: JwtService;

  beforeEach(async () => {
    prismaMock = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock.jwt.token'),
            verify: jest.fn().mockReturnValue({ sub: 'user-uuid' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              if (key === 'JWT_EXPIRATION') return '15m';
              return null;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'Password123' };

    it('returns tokens and user on valid credentials', async () => {
      const user = buildUser({
        passwordHash: await bcrypt.hash('Password123', 10),
      });

      prismaMock.client.user.findUnique.mockResolvedValue(user);
      prismaMock.client.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-uuid',
        isActive: true,
      });
      prismaMock.client.user.update.mockResolvedValue(user);
      prismaMock.client.auditLog.create.mockResolvedValue({});

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toHaveProperty('id', 'user-uuid');
      expect(result.user).toHaveProperty('email', 'test@example.com');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const user = buildUser();
      prismaMock.client.user.findUnique.mockResolvedValue(user);

      await expect(
        authService.login({ email: 'test@example.com', password: 'WrongPassword' })
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws UnauthorizedException for inactive user', async () => {
      const user = buildUser({
        isActive: false,
        passwordHash: await bcrypt.hash('Password123', 10),
      });
      prismaMock.client.user.findUnique.mockResolvedValue(user);

      await expect(authService.login(loginDto)).rejects.toThrow('deactivated');
    });

    it('throws ForbiddenException for suspended restaurant', async () => {
      const user = buildUser({
        passwordHash: await bcrypt.hash('Password123', 10),
      });
      prismaMock.client.user.findUnique.mockResolvedValue(user);
      prismaMock.client.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-uuid',
        isActive: false,
      });

      await expect(authService.login(loginDto)).rejects.toThrow('suspended');
    });

    it('allows SUPER_ADMIN login without restaurant check', async () => {
      const superAdmin = buildSuperAdmin({
        passwordHash: await bcrypt.hash('Password123', 10),
      });
      prismaMock.client.user.findUnique.mockResolvedValue(superAdmin);
      prismaMock.client.user.update.mockResolvedValue(superAdmin);
      prismaMock.client.auditLog.create.mockResolvedValue({});

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result.user.role).toBe('SUPER_ADMIN');
    });
  });

  describe('refresh', () => {
    it('returns new access token for valid refresh token', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue(buildUser());
      prismaMock.client.restaurant.findUnique.mockResolvedValue({
        id: 'restaurant-uuid',
        isActive: true,
      });

      const result = await authService.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(jwtService.verify).toHaveBeenCalledWith('valid-refresh-token', expect.anything());
    });

    it('throws on expired refresh token', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(authService.refresh('expired-token')).rejects.toThrow();
    });

    it('throws on deactivated user', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue(
        buildUser({ isActive: false })
      );

      await expect(authService.refresh('valid-token')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('writes audit log', async () => {
      prismaMock.client.user.findUnique.mockResolvedValue(buildUser());
      prismaMock.client.auditLog.create.mockResolvedValue({});

      await authService.logout('user-uuid');

      expect(prismaMock.client.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'USER_LOGOUT',
            userId: 'user-uuid',
          }),
        })
      );
    });
  });
});
