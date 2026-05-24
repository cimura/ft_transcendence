import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

// DBが完成するまでの仮の保存場所（メモリ上の配列）
const mockUsers: any[] = [];

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // 1. サインアップ（新規登録）
  async signUp(email: string, pass: string): Promise<any> {
    // 重複チェック: すでに同じメールアドレスが存在するか
    const existingUser = mockUsers.find((u) => u.email === email);
    if (existingUser) {
      // 存在した場合は、409 Conflict
      throw new ConflictException('Email already exists!');
    }
    // ソルト（ランダムな文字列）を生成し、パスワードと混ぜてハッシュ化
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(pass, saltRounds);

    // モックDBに保存
    const newUser = {
      id: Date.now().toString(),
      email,
      password: hashedPassword,
    };
    mockUsers.push(newUser);

    return { message: 'User successfully registered!' };
  }

  // 2. サインイン（ログイン）
  async signIn(email: string, pass: string): Promise<any> {
    // DB（モック）からユーザーを探す
    const user = mockUsers.find((u) => u.email === email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 送られてきたパスワードをハッシュ化し、保存されているハッシュ値と「一致」するか比較
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 一致したら、JWT（デジタルの通行証）を発行
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
