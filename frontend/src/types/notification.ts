export type NotificationType = 'friend_request' | 'room_invitation'

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

export interface RoomInvitationNotification {
  id: string
  type: 'room_invitation'
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
  | RoomInvitationNotification
