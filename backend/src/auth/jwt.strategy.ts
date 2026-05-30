import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      // HTTPヘッダーの 'Authorization: Bearer <token>' からトークンを抜き出す
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 有効期限が切れていたら 401 Unauthorized
      ignoreExpiration: false,
      // 署名が本物か検証するための秘密鍵（環境変数から取得）
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub };
  }
}
