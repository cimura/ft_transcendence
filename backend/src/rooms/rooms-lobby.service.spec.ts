import { RoomsLobbyService } from './rooms-lobby.service';
import { RoomsService } from './rooms.service';
import type { RoomSnapshot } from '@ft_transcendence/shared/rooms-events.types';

const buildRoomSnapshot = (
  overrides: Partial<RoomSnapshot> = {},
): RoomSnapshot => ({
  id: 'room-1',
  name: 'Test Room',
  hostId: 'user-1',
  hostName: 'Host',
  maxPlayers: 2,
  status: 'waiting',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
  startedAt: undefined,
  finishedAt: undefined,
  players: [
    {
      userId: 'user-1',
      username: 'Host',
      avatarUrl: undefined,
      isReady: true,
      isHost: true,
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
    it('findAll("waiting") の結果をそのまま返す', () => {
      const room1 = buildRoomSnapshot({ id: 'room-1' });
      const room2 = buildRoomSnapshot({ id: 'room-2' });
      roomsService.findAll.mockReturnValue([room1, room2]);

      const result = service.getLobbyRooms();

      expect(roomsService.findAll).toHaveBeenCalledWith('waiting');
      expect(result).toEqual([room1, room2]);
    });
  });

  describe('isLobbyVisible', () => {
    it('waiting なら true', () => {
      expect(service.isLobbyVisible(buildRoomSnapshot())).toBe(true);
    });

    it('waiting でなければ false', () => {
      expect(
        service.isLobbyVisible(buildRoomSnapshot({ status: 'playing' })),
      ).toBe(false);
    });
  });
});
