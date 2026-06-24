import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import {
  SignUpDuplicateField,
  SignUpRequestDto,
  SignUpResponseDto,
  SignUpConflictResponseDto,
} from './dto/signup.dto';
import { SignInRequestDto, SignInResponseDto } from './dto/signin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  // 1. サインアップ（新規登録）
  async signUp(dto: SignUpRequestDto): Promise<SignUpResponseDto> {
    const duplicateFields: SignUpDuplicateField[] = [];

    // 重複チェック: すでに同じメールアドレスが存在するか
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      duplicateFields.push(SignUpDuplicateField.EMAIL);
    }
    // 重複チェック: すでに同じユーザーネームが存在するか
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) {
      duplicateFields.push(SignUpDuplicateField.USERNAME);
    }
    // どちらかの重複があれば 409 Conflict
    if (duplicateFields.length > 0) {
      const errorBody: SignUpConflictResponseDto = {
        statusCode: 409,
        error: 'Conflict',
        message: 'Email or Username already exists.',
        fields: duplicateFields,
      };
      throw new ConflictException(errorBody);
    }

    // ソルト（ランダムな文字列）を生成し、パスワードと混ぜてハッシュ化
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
      },
    });

    return {
      id: user.id,
      accessToken: await this.generateToken(user.id),
    };
  }

  // 2. サインイン（ログイン）
  async signIn(dto: SignInRequestDto): Promise<SignInResponseDto> {
    // DBからユーザーを探す
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
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
