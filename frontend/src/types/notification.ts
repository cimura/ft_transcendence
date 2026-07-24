import type {
  RealtimeNotification,
  RealtimeNotificationActor,
} from '@ft_transcendence/shared/realtime-events.types'

export type NotificationType = RealtimeNotification['type']
export type NotificationActor = RealtimeNotificationActor
export type FriendRequestNotification = Extract<
  RealtimeNotification,
  { type: 'friend_request' }
>
export type RoomInvitationNotification = Extract<
  RealtimeNotification,
  { type: 'room_invitation' }
>
export type NotificationItem = RealtimeNotification
