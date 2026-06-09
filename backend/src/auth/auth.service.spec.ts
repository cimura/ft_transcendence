// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// 外部ライブラリ bcrypt を Jest のモック対象にする
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // 1. PrismaService のモック定義 (Userテーブルの操作関数をシミュレート)
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
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

    // テストケースごとにモックの呼び出し履歴をリセットする
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. signUp（新規登録）のテスト
  // ==========================================
  describe('signUp', () => {
    const signUpDto = { email: 'new@example.com', password: 'password123' };

    it('【正常系】ユーザーが重複していなければ、正常に作成されてトークンを返すこと', async () => {
      // モックの振る舞いを定義
      mockPrismaService.user.findUnique.mockResolvedValue(null); // 重複なし
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password'); // 暗号化成功
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-uuid-123',
        email: signUpDto.email,
      });
      mockJwtService.signAsync.mockResolvedValue('mock_access_token'); // トークン発行

      const result = await service.signUp(signUpDto);

      // アサーション（検証）
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: signUpDto.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(signUpDto.password, 10);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { email: signUpDto.email, passwordHash: 'hashed_password' },
        select: { id: true, email: true },
      });
      expect(result).toEqual({
        id: 'user-uuid-123',
        email: signUpDto.email,
        accessToken: 'mock_access_token',
      });
    });

    it('【異常系】メールアドレスが既に存在する場合、ConflictExceptionを投げること', async () => {
      // 既に存在するユーザーを返すように設定
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
      });

      // 例外が投げられることを検証 (C++の EXPECT_THROW と同じ)
      await expect(service.signUp(signUpDto)).rejects.toThrow(
        ConflictException,
      );

      // ユーザー重複で処理が止まるため、create は絶対に呼ばれないことを検証
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // 2. signIn（ログイン）のテスト
  // ==========================================
  describe('signIn', () => {
    const signInDto = { email: 'login@example.com', password: 'password123' };
    const dbUser = {
      id: 'user-uuid-999',
      email: 'login@example.com',
      passwordHash: 'hashed_password_in_db',
    };

    it('【正常系】アドレスが存在しパスワードが一致すれば、アクセストークンを返すこと', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // パスワード一致
      mockJwtService.signAsync.mockResolvedValue('mock_access_token');

      const result = await service.signIn(signInDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: signInDto.email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        signInDto.password,
        dbUser.passwordHash,
      );
      expect(result).toEqual({ accessToken: 'mock_access_token' });
    });

    it('【異常系】メールアドレスが登録されていない場合、UnauthorizedExceptionを投げること', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null); // ユーザーが見つからない

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(bcrypt.compare).not.toHaveBeenCalled(); // パスワード比較まで進まない
    });

    it('【異常系】パスワードが一致しない場合、UnauthorizedExceptionを投げること', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // パスワード不一致！

      await expect(service.signIn(signInDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled(); // トークンは発行されない
    });
  });
});
