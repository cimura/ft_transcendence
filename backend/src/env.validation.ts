import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  validateSync,
  IsOptional,
} from 'class-validator';

const JWT_SECRET_MIN_LENGTH = 32;

// 1. 環境変数のルールを定義
class EnvironmentVariables {
  @IsString()
  @IsNotEmpty({
    message: 'JWT_SECRET is required. Please set it in your .env file.',
  })
  @MinLength(JWT_SECRET_MIN_LENGTH, {
    message: `JWT_SECRET must be at least ${JWT_SECRET_MIN_LENGTH} characters long. Generate one with: openssl rand -hex 32`,
  })
  JWT_SECRET: string;

  // 正規表現を使って「数字 + s, m, h, d, w, y」の形式か、純粋な数字のみを許可する
  @IsOptional()
  @Matches(/^([0-9]+[smhdwy]?)$/, {
    message:
      'JWT_EXPIRES_IN is in an invalid format (e.g., 60s, 1d, 2h) or a pure number (seconds).',
  })
  JWT_EXPIRES_IN: string;
}

// 2. NestJSが起動する際に呼び出される検証関数
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  if (typeof validatedConfig.JWT_SECRET === 'string') {
    validatedConfig.JWT_SECRET = validatedConfig.JWT_SECRET.trim();
  }

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  // 不正な環境変数があればエラー
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  if (config.NODE_ENV === 'production') {
    const secret = validatedConfig.JWT_SECRET;
    const knownPlaceholders = new Set([
      'your_jwt_secret_key_here',
      'change_me',
      'changeme',
    ]);

    if (
      secret.length < JWT_SECRET_MIN_LENGTH ||
      knownPlaceholders.has(secret.toLowerCase())
    ) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters and must not be a known placeholder in production.',
      );
    }
  }

  return validatedConfig;
}
