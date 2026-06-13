// src/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  // 1. PrismaService のモック定義（実際のDBアクセスをシミュレート）
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        // ★ 依存している PrismaService の代わりにモックを注入する！
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined (インスタンスが正常に生成されること)', () => {
    expect(service).toBeDefined();
  });

  // profile メソッドのテスト
  describe('profile', () => {
    it('【正常系】ユーザーが見つかれば、情報を返すこと', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Takato',
        avatarUrl: null,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.profile('user-123');
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true, email: true, displayName: true, avatarUrl: true },
      });
    });

    it('【異常系】ユーザーが見つからなければ、UnauthorizedExceptionを投げること', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.profile('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
