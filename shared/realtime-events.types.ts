export type RealtimeNotificationActor = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type RealtimeNotification =
  | {
      id: string;
      type: 'friend_request';
      createdAt: string;
      actor: RealtimeNotificationActor;
      friendRequestId: string;
    }
  | {
      id: string;
      type: 'room_invitation';
      createdAt: string;
      actor: RealtimeNotificationActor;
      room: {
        id: string;
        name: string;
      };
      invitationId: string;
    };

export interface RealtimeClientToServerEvents {}

export interface RealtimeServerToClientEvents {
  'notification:new': (notification: RealtimeNotification) => void;
}
