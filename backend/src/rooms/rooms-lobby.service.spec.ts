import { RoomsLobbyService } from './rooms-lobby.service';
import { RoomsService } from './rooms.service';
import type { RoomResponse } from '../common/types/room.type';

const buildRoomResponse = (
  overrides: Partial<RoomResponse> = {},
): RoomResponse => ({
  id: 'room-1',
  gameId: 'bomberman',
  name: 'Test Room',
  hostId: 'user-1',
  hostName: 'Host',
  maxPlayers: 2,
  status: 'waiting',
  mode: 'online',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
  startedAt: null,
  finishedAt: null,
  players: [
    {
      userId: 'user-1',
      username: 'Host',
      avatarUrl: null,
      isReady: true,
      isHost: true,
      joinedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
  ],
  ...overrides,
});

describe('RoomsLobbyService', () => {
  let service: RoomsLobbyService;
  const roomsService = { findAll: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoomsLobbyService(roomsService as unknown as RoomsService);
  });

  describe('getLobbyRooms', () => {
    it('findAll("waiting") の結果のうち online のルームのみ返す', () => {
      const onlineRoom = buildRoomResponse({ id: 'room-online' });
      const localCpuRoom = buildRoomResponse({
        id: 'room-local',
        mode: 'local_cpu',
      });
      roomsService.findAll.mockReturnValue([onlineRoom, localCpuRoom]);

      const result = service.getLobbyRooms();

      expect(roomsService.findAll).toHaveBeenCalledWith('waiting');
      expect(result).toEqual([onlineRoom]);
    });

    it('findAll が空配列を返す場合は空配列を返す', () => {
      roomsService.findAll.mockReturnValue([]);

      const result = service.getLobbyRooms();

      expect(result).toEqual([]);
    });
  });

  describe('isLobbyVisible', () => {
    it('waiting かつ online なら true', () => {
      expect(service.isLobbyVisible(buildRoomResponse())).toBe(true);
    });

    it('local_cpu なら false', () => {
      expect(
        service.isLobbyVisible(buildRoomResponse({ mode: 'local_cpu' })),
      ).toBe(false);
    });

    it('waiting でなければ false', () => {
      expect(
        service.isLobbyVisible(buildRoomResponse({ status: 'playing' })),
      ).toBe(false);
    });

    it('waiting でも online でもなければ false', () => {
      expect(
        service.isLobbyVisible(
          buildRoomResponse({ status: 'finished', mode: 'local_cpu' }),
        ),
      ).toBe(false);
    });
  });

  describe('toSnapshot', () => {
    it('RoomResponse を RoomSnapshot (日時は ISO 文字列) に変換する', () => {
      const room = buildRoomResponse();

      expect(service.toSnapshot(room)).toEqual({
        id: 'room-1',
        gameId: 'bomberman',
        name: 'Test Room',
        hostId: 'user-1',
        hostName: 'Host',
        players: [
          {
            userId: 'user-1',
            username: 'Host',
            avatarUrl: null,
            isReady: true,
            isHost: true,
            joinedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
        maxPlayers: 2,
        status: 'waiting',
        mode: 'online',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        startedAt: undefined,
        finishedAt: undefined,
      });
    });

    it('startedAt / finishedAt が設定されている場合は ISO 文字列に変換する', () => {
      const room = buildRoomResponse({
        startedAt: new Date('2026-07-02T00:00:00.000Z'),
        finishedAt: new Date('2026-07-03T00:00:00.000Z'),
      });

      const snapshot = service.toSnapshot(room);

      expect(snapshot.startedAt).toBe('2026-07-02T00:00:00.000Z');
      expect(snapshot.finishedAt).toBe('2026-07-03T00:00:00.000Z');
    });

    it('players が複数いる場合は全員分をマッピングする', () => {
      const room = buildRoomResponse({
        players: [
          {
            userId: 'user-1',
            username: 'Host',
            avatarUrl: null,
            isReady: true,
            isHost: true,
            joinedAt: new Date('2026-07-01T00:00:00.000Z'),
          },
          {
            userId: 'user-2',
            username: 'Guest',
            avatarUrl: 'https://example.com/avatar.png',
            isReady: false,
            isHost: false,
            joinedAt: new Date('2026-07-01T01:00:00.000Z'),
          },
        ],
      });

      const snapshot = service.toSnapshot(room);

      expect(snapshot.players).toHaveLength(2);
      expect(snapshot.players[1]).toEqual({
        userId: 'user-2',
        username: 'Guest',
        avatarUrl: 'https://example.com/avatar.png',
        isReady: false,
        isHost: false,
        joinedAt: '2026-07-01T01:00:00.000Z',
      });
    });
  });
});
