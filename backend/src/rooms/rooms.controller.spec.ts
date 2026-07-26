import { Test, TestingModule } from '@nestjs/testing';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RoomsInvitationService } from './rooms-invitation.service';
import { RoomsChatService } from './rooms-chat.service';
import { RoomsGateway } from './rooms.gateway';
import type { RoomResponse } from '../common/types/room.type';
import type { UserRequest } from '../users/interfaces/user-request.interface';

describe('RoomsController', () => {
  let controller: RoomsController;
  let roomsService: jest.Mocked<
    Pick<RoomsService, 'create' | 'join' | 'leave'>
  >;
  let roomsGateway: jest.Mocked<
    Pick<RoomsGateway, 'emitRoomCreated' | 'emitRoomUpdated' | 'emitRoomDeleted'>
  >;

  const mockRoomResponse: RoomResponse = {
    id: 'room-1',
    gameId: 'game-1',
    name: 'test room',
    hostId: 'user-1',
    hostName: 'hostuser',
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
        username: 'hostuser',
        avatarUrl: null,
        isReady: true,
        isHost: true,
        joinedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ],
  };

  const mockRequest = { user: { userId: 'user-1' } } as UserRequest;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: [
        {
          provide: RoomsService,
          useValue: {
            create: jest.fn(),
            join: jest.fn(),
            leave: jest.fn(),
          },
        },
        {
          provide: RoomsInvitationService,
          useValue: {},
        },
        {
          provide: RoomsChatService,
          useValue: {},
        },
        {
          provide: RoomsGateway,
          useValue: {
            emitRoomCreated: jest.fn(),
            emitRoomUpdated: jest.fn(),
            emitRoomDeleted: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
    roomsService = module.get(RoomsService);
    roomsGateway = module.get(RoomsGateway);
  });

  describe('create', () => {
    it('ルームを作成し、gateway 経由で room:created を配信して結果を返す', async () => {
      roomsService.create.mockResolvedValue(mockRoomResponse);

      const dto = { name: 'test room', maxPlayers: 2 as const };
      const result = await controller.create(mockRequest, dto);

      expect(roomsService.create).toHaveBeenCalledWith('user-1', dto);
      expect(roomsGateway.emitRoomCreated).toHaveBeenCalledWith(
        mockRoomResponse,
      );
      expect(result).toBe(mockRoomResponse);
    });

    it('作成に失敗した場合は emitRoomCreated を呼ばずにエラーを伝播する', async () => {
      const error = new Error('failed to create room');
      roomsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockRequest, {
          name: 'test room',
          maxPlayers: 2 as const,
        }),
      ).rejects.toThrow('failed to create room');

      expect(roomsGateway.emitRoomCreated).not.toHaveBeenCalled();
    });
  });
});