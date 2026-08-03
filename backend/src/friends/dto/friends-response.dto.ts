import { ApiProperty } from '@nestjs/swagger';
import { FriendRequestStatus } from 'src/generated/prisma/enums';
import {
  PRESENCE_STATUSES,
  type PresenceStatus,
} from '@ft_transcendence/shared/realtime-events.types';

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
    description: 'ユーザー名',
  })
  username: string;

  @ApiProperty({
    example: 'http://localhost:8443/uploads/avatars/default.png',
    description: 'プロフィール画像のURL',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({
    enum: PRESENCE_STATUSES,
    example: 'offline',
    description: 'フレンドのオンライン状態',
  })
  status: PresenceStatus;
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
