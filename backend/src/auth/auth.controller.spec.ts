// src/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignUpRequestDto } from './dto/signup.dto';
import { SignInRequestDto } from './dto/signin.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // テスト内で使い回す共通のモックデータ
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Bob',
    avatarUrl: 'http://example.com',
  };

  const expectedProfileResponse = {
    message: 'This is a protected route. You are authenticated.',
    user: mockUser,
  };

  beforeEach(async () => {
    // AuthServiceの偽物（ダミー）を定義
    const mockAuthService = {
      signUp: jest.fn().mockResolvedValue({
        id: 'Mocked UserID', // タイポを修正
        email: 'mock@mock.com',
        accessToken: 'mock_token',
      }),
      signIn: jest.fn().mockResolvedValue({ accessToken: 'mock_token' }),
      // ★ 修正: Controller が内側を組み立てるので、ここでは純粋な user データだけを返す
      profile: jest.fn().mockResolvedValue(mockUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  // テストケース1: SignUp
  it('should pass data to authService.signUp', async () => {
    const dto: SignUpRequestDto = {
      email: 'test@example.com',
      password: 'password123',
    };
    const result = await controller.signUp(dto);

    // 1. Service の signUp 関数が、DTOを引数に正しく呼ばれたか検証
    expect(authService.signUp).toHaveBeenCalledWith(dto);

    // 2. 戻り値全体が、モックのデータと完全一致するかを1回で検証
    expect(result).toEqual({
      id: 'Mocked UserID',
      email: 'mock@mock.com',
      accessToken: 'mock_token',
    });
  });

  // テストケース2: SignIn
  it('should pass data to authService.signIn', async () => {
    const dto: SignInRequestDto = {
      email: 'test@example.com',
      password: 'password123',
    };
    const result = await controller.signIn(dto);

    expect(authService.signIn).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accessToken: 'mock_token' });
  });

  // テストケース3: Profile
  it('should pass data to authService.profile', async () => {
    const mockReq = {
      user: {
        userId: 'user-123',
      },
    } as any;

    const result = await controller.profile(mockReq);

    // 1. トークンから抽出された userId が正しく Service に渡っているか検証
    expect(authService.profile).toHaveBeenCalledWith('user-123');

    // 2. Controller によって綺麗にメッセージがラップされた結果を検証
    expect(result).toEqual(expectedProfileResponse);
  });
});
