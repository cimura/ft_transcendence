import 'dotenv/config';
import { access, unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { MatchResult } from '../src/generated/prisma/enums';
import { IMAGE_UPLOAD_DIR } from '../src/uploads/uploads.constants';

// PNGのマジックバイトのみ。detectImageMimeType はヘッダーしか見ないため十分。
const PNG_MAGIC_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);

describe('DELETE /users/me (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // UploadedImage は User への外部キーを持たないため Cascade では消えない。
    // 件数を検証するテストが前のテストの残骸に影響されないよう明示的に消す。
    await prisma.user.deleteMany();
    await prisma.uploadedImage.deleteMany();
    await prisma.match.deleteMany();
  });

  async function signup(email: string, username: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, username, password: 'password123' })
      .expect(HttpStatus.CREATED);

    return response.body.accessToken as string;
  }

  async function sendFriendRequest(token: string, targetUserId: string) {
    await request(app.getHttpServer())
      .post('/friends/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetUserId })
      .expect(HttpStatus.CREATED);
  }

  async function uploadAvatar(token: string) {
    const response = await request(app.getHttpServer())
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', PNG_MAGIC_BYTES, 'avatar.png')
      .expect(HttpStatus.OK);

    const avatarUrl = response.body.avatarUrl as string;
    const filename = avatarUrl.split('/').pop()!;

    return {
      avatarUrl,
      filename,
      filePath: resolve(process.cwd(), join(IMAGE_UPLOAD_DIR, filename)),
    };
  }

  async function deleteMe(token: string) {
    await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.OK);
  }

  it('deletes the account after a pending friend request exists (Test A)', async () => {
    const requesterToken = await signup('requester@example.com', 'requester');
    await signup('receiver@example.com', 'receiver');

    const receiver = await prisma.user.findUniqueOrThrow({
      where: { username: 'receiver' },
    });

    await sendFriendRequest(requesterToken, receiver.id);

    expect(await prisma.friendship.count()).toBe(1);

    await deleteMe(requesterToken);

    expect(await prisma.friendship.count()).toBe(0);
  });

  // Friendship は requesterId / receiverId の2つの外部キーで User を参照しているため、
  // 申請を受けた側の退会も別の制約を踏む。両方を塞げているかを確認する。
  it('deletes the account of the user who received the friend request (Test A-2)', async () => {
    const requesterToken = await signup('requester@example.com', 'requester');
    const receiverToken = await signup('receiver@example.com', 'receiver');

    const receiver = await prisma.user.findUniqueOrThrow({
      where: { username: 'receiver' },
    });

    await sendFriendRequest(requesterToken, receiver.id);

    expect(await prisma.friendship.count()).toBe(1);

    await deleteMe(receiverToken);

    expect(await prisma.friendship.count()).toBe(0);
  });

  it('keeps friendships between other users intact', async () => {
    const tokenA = await signup('a@example.com', 'usera');
    const tokenB = await signup('b@example.com', 'userb');
    await signup('c@example.com', 'userc');

    const userB = await prisma.user.findUniqueOrThrow({
      where: { username: 'userb' },
    });
    const userC = await prisma.user.findUniqueOrThrow({
      where: { username: 'userc' },
    });

    // A-B, A-C, B-C の3組を作り、A の退会で B-C が巻き込まれないことを見る
    await sendFriendRequest(tokenA, userB.id);
    await sendFriendRequest(tokenA, userC.id);
    await sendFriendRequest(tokenB, userC.id);

    expect(await prisma.friendship.count()).toBe(3);

    await deleteMe(tokenA);

    const remaining = await prisma.friendship.findMany();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].requesterId).toBe(userB.id);
    expect(remaining[0].receiverId).toBe(userC.id);
  });

  it('deletes the account after completing a match, keeping the match row (Test B)', async () => {
    const token = await signup('player@example.com', 'player');
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: 'player' },
    });

    const match = await prisma.match.create({
      data: {
        gameType: 'bomberman',
        finishedAt: new Date(),
        participants: {
          create: {
            userId: user.id,
            result: MatchResult.WIN,
            kills: 3,
            rank: 1,
          },
        },
      },
    });

    await deleteMe(token);

    expect(await prisma.matchParticipant.count()).toBe(0);
    expect(
      await prisma.match.findUnique({ where: { id: match.id } }),
    ).not.toBeNull();
  });

  it('deletes the uploaded avatar record and file (Test C)', async () => {
    const token = await signup('avatar@example.com', 'avataruser');
    const { filePath } = await uploadAvatar(token);

    // アップロード直後はファイルもレコードも存在する
    await expect(access(filePath)).resolves.toBeUndefined();
    expect(await prisma.uploadedImage.count()).toBe(1);

    await deleteMe(token);

    expect(await prisma.uploadedImage.count()).toBe(0);
    await expect(access(filePath)).rejects.toThrow();
  });

  // デフォルトアバターは /uploads/images 配下ではない共有リソースなので、
  // 退会時のクリーンアップ対象から外れていなければならない。
  it('keeps default avatars and other users uploads when deleting an account', async () => {
    const uploaderToken = await signup('uploader@example.com', 'uploader');
    const { filePath } = await uploadAvatar(uploaderToken);

    const defaultAvatarToken = await signup(
      'default@example.com',
      'defaultuser',
    );
    await request(app.getHttpServer())
      .patch('/users/me/avatar')
      .set('Authorization', `Bearer ${defaultAvatarToken}`)
      .send({ avatarUrl: '/avatars/default-1.svg' })
      .expect(HttpStatus.OK);

    expect(await prisma.uploadedImage.count()).toBe(1);

    await deleteMe(defaultAvatarToken);

    // 別ユーザーがアップロードした画像は、レコードも実ファイルも無傷であること
    expect(await prisma.uploadedImage.count()).toBe(1);
    await expect(access(filePath)).resolves.toBeUndefined();

    // このテストは退会でファイルを消さないので、後始末は自前で行う
    await unlink(filePath);
  });

  // 実ファイルの削除失敗は logger.warn に留め、退会そのものは成功させる
  it('completes the deletion even when the avatar file is already missing', async () => {
    const token = await signup('missing@example.com', 'missingfile');
    const { filePath } = await uploadAvatar(token);

    // 退会前に実ファイルだけを消し、unlink が ENOENT で失敗する状況を作る
    await unlink(filePath);

    await deleteMe(token);

    expect(await prisma.uploadedImage.count()).toBe(0);
    expect(await prisma.user.count()).toBe(0);
  });

  it('removes achievements and revokes access after deletion', async () => {
    const token = await signup('full@example.com', 'fulluser');
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: 'fulluser' },
    });

    await prisma.userAchievement.create({
      data: { userId: user.id, achievementId: 'first-win' },
    });

    await deleteMe(token);

    expect(await prisma.userAchievement.count()).toBe(0);

    await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.NOT_FOUND);
  });
});
