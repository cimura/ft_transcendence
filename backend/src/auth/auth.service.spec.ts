import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    // TestingModule は、このテスト専用の一時的なコンテナ環境を作ります
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          // JwtServiceを要求されたら、この偽物（モック）を渡す、という設定
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('fake_jwt_token_123'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // テストケース1: 正常なサインアップ
  it('should register a new user', async () => {
    const result = await service.signUp('test1@example.com', 'password123');
    expect(result).toEqual({ message: 'User successfully registered!' });
  });

  // テストケース2: 正常なサインイン
  it('should sign in and return a token', async () => {
    // 準備: まずユーザーを登録する
    await service.signUp('test2@example.com', 'password123');
    // 実行: サインインを試みる
    const result = await service.signIn('test2@example.com', 'password123');
    // 検証: モック化したJwtServiceが 'fake_jwt_token_123' を返すはず
    expect(result).toEqual({ access_token: 'fake_jwt_token_123' });
  });

  // テストケース3: 存在しないユーザーでのサインイン失敗
  it('should throw UnauthorizedException for unknown user', async () => {
    // 実行 & 検証: エラー（例外）が投げられる（throwされる）ことを確認する
    await expect(service.signIn('unknown@example.com', 'password123'))
      .rejects.toThrow(UnauthorizedException);
  });

  // テストケース4: 間違ったパスワードでのサインイン失敗
  it('should throw UnauthorizedException for wrong password', async () => {
    await service.signUp('test3@example.com', 'password123');
    await expect(service.signIn('test3@example.com', 'wrongpassword'))
      .rejects.toThrow(UnauthorizedException);
  });

  // テストケース5: 重複したメールアドレスでのサインアップ失敗
  it('should throw ConflictException if email already exists', async () => {
    // 準備: 1回目の登録（成功するはず）
    await service.signUp('duplicate@example.com', 'password123');
    // 実行 & 検証: 全く同じメールアドレスで2回目の登録を試みると、ConflictExceptionが投げられるはず
    await expect(service.signUp('duplicate@example.com', 'anotherpassword'))
      .rejects.toThrow(ConflictException);
  });
});
