import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    // AuthServiceの偽物（ダミー）を定義
    // 呼ばれたら、固定のオブジェクトを即座に返すように設定（モック化）
    const mockAuthService = {
      signUp: jest.fn().mockResolvedValue({ message: 'Mocked sign up' }),
      signIn: jest.fn().mockResolvedValue({ access_token: 'mock_token' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService, // 本物のAuthServiceの代わりに偽物を注入
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  // テストケース1: SignUp時のJWTトークン生成の確認
  it('should pass data to authService.signUp', async () => {
    const dto = { email: 'test@example.com', password: 'pass' };
    const result = await controller.signUp(dto);
    // 1. コントローラーが、ServiceのsignUp関数を正しい引数で呼び出したかを確認
    expect(authService.signUp).toHaveBeenCalledWith('test@example.com', 'pass');
    // 2. 返り値がServiceからの返り値と一致しているかを確認
    expect(result).toEqual({ message: 'Mocked sign up' });
  });

  // テストケース2: SignIn時のJWTトークン生成の確認
  it('should pass data to authService.signIn', async () => {
    const dto = { email: 'test@example.com', password: 'pass' };
    const result = await controller.signIn(dto);
    expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'pass');
    expect(result).toEqual({ access_token: 'mock_token' });
  });
});
