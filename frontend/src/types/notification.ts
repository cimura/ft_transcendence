export type NotificationType = 'friend_request' | 'game_invite'

export interface NotificationActor {
  id: string
  username: string
  avatarUrl: string | null
}

export interface FriendRequestNotification {
  id: string
  type: 'friend_request'
  createdAt: string
  actor: NotificationActor
  friendRequestId: string
}

export interface GameInviteNotification {
  id: string
  type: 'game_invite'
  createdAt: string
  actor: NotificationActor
  room: {
    id: string
    name: string
  }
  invitationId: string
}

export type NotificationItem =
  | FriendRequestNotification
  | GameInviteNotification
