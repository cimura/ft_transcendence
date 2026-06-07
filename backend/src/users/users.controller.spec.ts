// src/users/users.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ProfileResponseDto } from './dto/profile.dto';
import type { UserRequest } from './interfaces/user-request.interface';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  // 1. UsersService のモック定義
  const mockUsersService = {
    profile: jest.fn(),
    updateMe: jest.fn(),
    deleteMe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        // ★ 依存している UsersService の代わりにモックを注入する！
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined (インスタンスが正常に生成されること)', () => {
    expect(controller).toBeDefined();
  });

  describe('profile', () => {
    it('ユーザーのプロフィールをラップして正常に返すこと', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Takato',
        avatarUrl: null,
      };
      mockUsersService.profile.mockResolvedValue(mockUser);

      // ExpressのRequestオブジェクトのモックを作成
      const mockReq = {
        user: { userId: 'user-123', email: 'test@example.com' },
      } as UserRequest;

      const result = await controller.profile(mockReq);

      expect(usersService.profile).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        message: 'This is a protected route. You are authenticated.',
        user: mockUser,
      });
    });
  });
});
