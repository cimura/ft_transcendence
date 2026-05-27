import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma.service';
import { SignUpRequestDto, SignUpResponseDto } from './dto/signup.dto';
import { SignInRequestDto, SignInResponseDto } from './dto/signin.dto';
import * as bcrypt from 'bcrypt';

// DBが完成するまでの仮の保存場所（メモリ上の配列）

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  // 1. サインアップ（新規登録）
  async signUp(dto: SignUpRequestDto): Promise<SignUpResponseDto> {
    // 重複チェック: すでに同じメールアドレスが存在するか
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      // 存在した場合は 409 Conflict
      throw new ConflictException('email already exists!');
    }
    // ソルト（ランダムな文字列）を生成し、パスワードと混ぜてハッシュ化
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // モックDBに保存
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        email: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      accessToken: await this.generateToken(user.id),
    };
  }

  // 2. サインイン（ログイン）
  async signIn(dto: SignInRequestDto): Promise<SignInResponseDto> {
    // DBからユーザーを探す
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 送られてきたパスワードをハッシュ化し、保存されているハッシュ値と「一致」するか比較
    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 一致したら、JWT（デジタルの通行証）を発行
    return {
      accessToken: await this.generateToken(user.id),
    };
  }

  private async generateToken(userId: string): Promise<string> {
    return await this.jwtService.signAsync({ sub: userId });
  }
}
