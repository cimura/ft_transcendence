import { plainToInstance } from 'class-transformer';
import { IsString, IsNotEmpty, Matches, validateSync, IsOptional } from 'class-validator';

// 1. 環境変数のルールを定義
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty({ message: 'JWT_SECRET is required. Please set it in your .env file.' })
  JWT_SECRET: string;

  // 正規表現を使って「数字 + s, m, h, d, w, y」の形式か、純粋な数字のみを許可する
  @IsOptional()
  @Matches(/^([0-9]+[smhdwy]?)$/, {
    message: 'JWT_EXPIRES_IN is in an invalid format (e.g., 60s, 1d, 2h) or a pure number (seconds).',
  })
  JWT_EXPIRES_IN: string;
}

// 2. NestJSが起動する際に呼び出される検証関数
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );

  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  // 不正な環境変数があればエラー
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  
  return validatedConfig;
}