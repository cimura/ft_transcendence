import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('AuthController (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 全てのテストが始まる前に、1回だけ仮想NestJSアプリを起動する
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // 本番と全く同じモジュールを読み込む
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  // テストが終わったら仮想アプリを閉じる
  afterAll(async () => {
    await app.close();
  });

  // 各テストケースの前にデータベースを綺麗にする
  beforeEach(async () => {
    await prisma.user.deleteMany(); // テスト用ユーザーテーブルをクリア
  });

  // テストケース①：正常なサインアップ
  it('/auth/signup (POST) - 正常登録', async () => {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'test@example.com',
        username: 'takato',
        password: 'password123',
      })
      .expect(HttpStatus.CREATED) // 201が返ることを期待
      .expect((res) => {
        expect(res.body).toHaveProperty('accessToken'); // トークンが含まれているか
      });
  });

  // テストケース②：Usernameの重複チェックテスト
  it('/auth/signup (POST) - ユーザー名の重複で409エラー', async () => {
    // 1. あらかじめ1人登録しておく
    await prisma.user.create({
      data: {
        email: 'existing@example.com',
        username: 'takato', // この名前を奪う
        passwordHash: 'dummy_hash',
      },
    });

    // 2. 全く同じusernameで、別のemailを使ってサインアップを試みる
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'new@example.com', // emailは被っていない
        username: 'takato', // usernameが被っている
        password: 'password123',
      })
      .expect(HttpStatus.CONFLICT) // 409 Conflict が返ることを期待
      .expect((res) => {
        // バックエンドが仕込んだJSONの中身をチェック
        expect(res.body.error).toBe('Conflict');
        expect(res.body.fields).toContain('username'); // fieldsに'username'が入っているか
        expect(res.body.fields).not.toContain('email'); // emailは入っていないはず
      });
  });
});
