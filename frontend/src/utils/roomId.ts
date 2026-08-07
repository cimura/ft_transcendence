// バックエンドの randomUUID() (v4) が払い出す形式に合わせる。
// ParseUUIDPipe({ version: '4' }) (backend/src/rooms/rooms.controller.ts) と同じ判定。
const ROOM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const isRoomId = (value: string | undefined): value is string =>
  value !== undefined && ROOM_ID_PATTERN.test(value)
