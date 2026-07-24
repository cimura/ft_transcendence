import { ApiProperty } from '@nestjs/swagger';
import { FriendRequestStatus } from 'src/generated/prisma/enums';

/**
 * フレンドの基本情報を表すDTO（GET /api/friends）
 */
export class FriendInfoDto {
  @ApiProperty({
    example: '3f9b7b2a-89ab-cdef-0123-456789abcdef',
    description: 'フレンドのユーザーID',
  })
  id: string;

  @ApiProperty({
    example: 'takato_06',
    description:
      '表示名（displayNameがない場合はemailの頭文字やアカウント名など）',
  })
  username: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'メールアドレス',
  })
  email: string;

  @ApiProperty({
    example: 'http://localhost:8443/uploads/avatars/default.png',
    description: 'プロフィール画像のURL',
    nullable: true,
  })
  avatarUrl: string | null;
}

/**
 * フレンド申請送信時のレスポンスDTO（POST /api/friends/request）
 */
export class FriendRequestResponseDto {
  @ApiProperty({
    example: 'Friend request sent successfully.',
    description: '申請送信の完了メッセージ',
  })
  message: string;

  @ApiProperty({
    enum: FriendRequestStatus,
    example: FriendRequestStatus.PENDING,
    description: '申請後のフレンドシップの最新ステータス',
  })
  status: FriendRequestStatus;
}

/**
 * フレンド申請を送ってきたユーザーの情報を表すDTO
 */
export class PendingRequesterInfoDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    description: '申請者のユーザーID',
  })
  id: string;

  @ApiProperty({
    example: 'requester@example.com',
    description: '申請者のメールアドレス',
  })
  email: string;

  @ApiProperty({
    example: 'Alice',
    description: '申請者の表示名（username）',
  })
  username: string;

  @ApiProperty({
    example: 'http://localhost:8443/uploads/avatars/alice.png',
    description: '申請者のプロフィール画像URL',
    nullable: true,
  })
  avatarUrl: string | null;
}

/**
 * 5. 届いているフレンド申請の一覧を表すDTO（GET /api/friends/requests）
 */
export class ReceivedFriendRequestDto {
  @ApiProperty({
    example: '7a8b9c0d-1e2f-3a4b-5c6d-7e8f9a0b1c2d',
    description: 'フレンドシップ（申請レコード）自体のユニークID（requestId）',
  })
  id: string;

  @ApiProperty({
    enum: FriendRequestStatus,
    example: FriendRequestStatus.PENDING,
    description: '申請の現在のステータス',
  })
  status: FriendRequestStatus;

  @ApiProperty({
    description: '申請を送ってきたユーザーの詳細情報',
    type: PendingRequesterInfoDto,
  })
  requester: PendingRequesterInfoDto;
}

/**
 * フレンド申請承認時のレスポンスDTO（PUT /api/friends/:requestId/accept）
 */
export class FriendAcceptResponseDto {
  @ApiProperty({
    example: 'Friend request accepted successfully.',
    description: '申請承認の完了メッセージ',
  })
  message: string;

  @ApiProperty({
    enum: FriendRequestStatus,
    example: FriendRequestStatus.ACCEPTED,
    description: '承認後のフレンドシップの最新ステータス',
  })
  status: FriendRequestStatus;
}

/**
 * フレンド申請拒否時のレスポンスDTO（PUT /api/friends/:requestId/reject）
 */
export class FriendRejectResponseDto {
  @ApiProperty({
    example: 'Friend request rejected successfully.',
    description: '申請拒否・削除の完了メッセージ',
  })
  message: string;
}

/**
 * フレンド削除時のレスポンスDTO（DELETE /api/friends/:userId）
 */
export class FriendDeleteResponseDto {
  @ApiProperty({
    example: 'Friend removed successfully.',
    description: 'フレンド解除の完了メッセージ',
  })
  message: string;
}
