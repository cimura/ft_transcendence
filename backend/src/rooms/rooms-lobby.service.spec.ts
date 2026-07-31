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
  mode: 'online',
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
    it('findAll("waiting") の結果のうち online のルームのみ返す', () => {
      const onlineRoom = buildRoomSnapshot({ id: 'room-online' });
      const localCpuRoom = buildRoomSnapshot({
        id: 'room-local',
        mode: 'local_cpu',
      });
      roomsService.findAll.mockReturnValue([onlineRoom, localCpuRoom]);

      const result = service.getLobbyRooms();

      expect(roomsService.findAll).toHaveBeenCalledWith('waiting');
      expect(result).toEqual([onlineRoom]);
    });
  });

  describe('isLobbyVisible', () => {
    it('waiting かつ online なら true', () => {
      expect(service.isLobbyVisible(buildRoomSnapshot())).toBe(true);
    });

    it('local_cpu なら false', () => {
      expect(
        service.isLobbyVisible(buildRoomSnapshot({ mode: 'local_cpu' })),
      ).toBe(false);
    });

    it('waiting でなければ false', () => {
      expect(
        service.isLobbyVisible(buildRoomSnapshot({ status: 'playing' })),
      ).toBe(false);
    });
  });
});
