// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // 1. PrismaService のモック定義
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(), // OR検索用
      create: jest.fn(),
    },
  };

  // 2. JwtService のモック定義
  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  // ==========================================
  // 1. signUp（新規登録）のテスト
  // ==========================================
  describe('signUp', () => {
    const signUpDto = {
      email: 'new@example.com',
      username: 'userA',
      password: 'password123',
    };

    it('【正常系】ユーザーが重複していなければ、正常に作成されてトークンを返すこと', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-uuid-123',
      });
      mockJwtService.signAsync.mockResolvedValue('mock_access_token');

      const result = await service.signUp(signUpDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: signUpDto.email },
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { username: signUpDto.username },
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(signUpDto.password, 10);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: signUpDto.email,
          username: signUpDto.username,
          passwordHash: 'hashed_password',
        },
        select: { id: true },
      });

      expect(result).toEqual({
        id: 'user-uuid-123',
        accessToken: 'mock_access_token',
      });
    });

    it('【異常系】メールアドレスが既に存在する場合、ConflictExceptionを投げること', async () => {
      // 1回目はユーザーあり（重複）、2回目はnull（未重複）と順番に解決させる
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ id: 'existing-id' })
        .mockResolvedValueOnce(null);

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('【異常系】ユーザーネームが既に存在する場合、ConflictExceptionを投げること', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing-id' });

      await expect(service.signUp(signUpDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // 2. signIn（ログイン）のテスト
  // ==========================================
  describe('signIn', () => {
    // データベースに既に登録されている想定のユーザーレコード
    const dbUser = {
      id: 'user-uuid-999',
      email: 'login@example.com',
      username: 'userA',
      passwordHash: 'hashed_password_in_db',
    };

    // クラス全体の共通オブジェクトを一度退避させ、各itの中で個別定義します
    beforeEach(() => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('mock_access_token');
    });

    it('【正常系】ユーザー名（username）を入力してパスワードが一致すれば、アクセストークンを返すこと', async () => {
      // ➔ ユーザーネームが入力されたケース
      const signInWithUsernameDto = {
        identifier: 'userA',
        password: 'password123',
      };
      mockPrismaService.user.findFirst.mockResolvedValue(dbUser);

      const result = await service.signIn(signInWithUsernameDto);

      // 内部クエリが正しく組み立てられているかを検証
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: signInWithUsernameDto.identifier },
            { username: signInWithUsernameDto.identifier },
          ],
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        signInWithUsernameDto.password,
        dbUser.passwordHash,
      );
      expect(result).toEqual({ accessToken: 'mock_access_token' });
    });

    it('【正常系】メールアドレス（email）を入力してパスワードが一致すれば、アクセストークンを返すこと', async () => {
      // ➔ メールアドレスが入力されたケース
      const signInWithEmailDto = {
        identifier: 'login@example.com',
        password: 'password123',
      };
      mockPrismaService.user.findFirst.mockResolvedValue(dbUser);

      const result = await service.signIn(signInWithEmailDto);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: signInWithEmailDto.identifier },
            { username: signInWithEmailDto.identifier },
          ],
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        signInWithEmailDto.password,
        dbUser.passwordHash,
      );
      expect(result).toEqual({ accessToken: 'mock_access_token' });
    });

    it('【異常系】アカウントが登録されていない場合、UnauthorizedExceptionを投げること', async () => {
      const signInDto = { identifier: 'unknown_user', password: 'password123' };
      mockPrismaService.user.findFirst.mockResolvedValue(null); // DB上で誰も見つからない

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('【異常系】パスワードが一致しない場合、UnauthorizedExceptionを投げること', async () => {
      const signInDto = { identifier: 'userA', password: 'wrong_password' };
      mockPrismaService.user.findFirst.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // パスワード不一致！

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
