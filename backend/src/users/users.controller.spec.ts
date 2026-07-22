import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { profileById: jest.Mock };

  beforeEach(async () => {
    usersService = {
      profileById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            profile: jest.fn(),
            profileById: usersService.profileById,
            updateMe: jest.fn(),
            deleteMe: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the profile for the route user ID', async () => {
    const user = {
      id: 'user-id',
      username: 'user',
      displayName: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersService.profileById.mockResolvedValue(user);

    await expect(controller.profileById('user-id')).resolves.toEqual({
      message: 'Profile retrieved successfully.',
      user,
    });
    expect(usersService.profileById).toHaveBeenCalledWith('user-id');
  });
});
