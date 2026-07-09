import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let uploadsService: {
    saveImage: jest.Mock;
    deleteImage: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    uploadsService = {
      saveImage: jest.fn(),
      deleteImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: UploadsService,
          useValue: uploadsService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('cleans up uploaded image when avatar update fails', async () => {
    const uploadedImage = {
      id: 'image-id',
      filename: 'avatar.png',
      url: '/uploads/images/avatar.png',
    };
    const file = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('avatar'),
    } as Express.Multer.File;

    uploadsService.saveImage.mockResolvedValue(uploadedImage);
    prisma.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(service.updateAvatar('user-id', file)).rejects.toThrow(
      'User not found',
    );
    expect(uploadsService.deleteImage).toHaveBeenCalledWith(uploadedImage);
  });
});
