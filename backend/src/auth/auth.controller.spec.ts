// src/auth/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignUpRequestDto } from './dto/signup.dto';
import { SignInRequestDto } from './dto/signin.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    // 最新の仕様(emailを含まない構造)に合わせたServiceのモック
    const mockAuthService = {
      signUp: jest.fn().mockResolvedValue({
        id: 'Mocked UserID',
        accessToken: 'mock_token',
      }),
      signIn: jest.fn().mockResolvedValue({ accessToken: 'mock_token' }),
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
      username: 'userA', // username を追加
      password: 'password123',
    };
    const result = await controller.signUp(dto);

    expect(authService.signUp).toHaveBeenCalledWith(dto);

    // 戻り値の検証から余分な email フィールドを排除
    expect(result).toEqual({
      id: 'Mocked UserID',
      accessToken: 'mock_token',
    });
  });

  // テストケース2: SignIn
  it('should pass data to authService.signIn', async () => {
    const dto: SignInRequestDto = {
      identifier: 'test@example.com', // identifier に変更
      password: 'password123',
    };
    const result = await controller.signIn(dto);

    expect(authService.signIn).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ accessToken: 'mock_token' });
  });
});
