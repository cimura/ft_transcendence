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
    findImageByUrl: jest.Mock;
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
      findImageByUrl: jest.fn(),
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

  it('returns a profile for the specified user', async () => {
    const user = {
      id: 'user-id',
      username: 'user',
      displayName: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.profileById('user-id')).resolves.toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-id' },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('throws when the specified profile does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.profileById('missing-user')).rejects.toMatchObject({
      status: 404,
      response: {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      },
    });
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
    prisma.user.findUnique.mockResolvedValue({ avatarUrl: null });
    prisma.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    await expect(service.updateAvatar('user-id', file)).rejects.toThrow(
      'User not found',
    );
    expect(uploadsService.saveImage).toHaveBeenCalledWith(file);
    expect(uploadsService.deleteImage).toHaveBeenCalledWith(uploadedImage);
  });

  it('deletes the previous managed avatar image after a successful update', async () => {
    const uploadedImage = {
      id: 'new-image-id',
      filename: 'new-avatar.png',
      url: '/uploads/images/new-avatar.png',
    };
    const previousImage = {
      id: 'old-image-id',
      filename: 'old-avatar.png',
      url: '/uploads/images/old-avatar.png',
    };
    const updatedUser = {
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      displayName: null,
      avatarUrl: uploadedImage.url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const file = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('avatar'),
    } as Express.Multer.File;

    prisma.user.findUnique.mockResolvedValue({ avatarUrl: previousImage.url });
    uploadsService.saveImage.mockResolvedValue(uploadedImage);
    uploadsService.findImageByUrl.mockResolvedValue(previousImage);
    prisma.user.update.mockResolvedValue(updatedUser);

    await expect(service.updateAvatar('user-id', file)).resolves.toEqual({
      message: 'Avatar updated successfully',
      avatarUrl: uploadedImage.url,
      user: updatedUser,
    });

    expect(uploadsService.saveImage).toHaveBeenCalledWith(file);
    expect(uploadsService.findImageByUrl).toHaveBeenCalledWith(
      previousImage.url,
    );
    expect(uploadsService.deleteImage).toHaveBeenCalledWith(previousImage);
  });

  it('does not delete a default avatar after uploading a custom avatar', async () => {
    const uploadedImage = {
      id: 'image-id',
      filename: 'avatar.png',
      url: '/uploads/images/avatar.png',
    };
    const updatedUser = {
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      displayName: null,
      avatarUrl: uploadedImage.url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const file = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('avatar'),
    } as Express.Multer.File;

    prisma.user.findUnique.mockResolvedValue({
      avatarUrl: '/avatars/default-1.svg',
    });
    uploadsService.saveImage.mockResolvedValue(uploadedImage);
    prisma.user.update.mockResolvedValue(updatedUser);

    await expect(service.updateAvatar('user-id', file)).resolves.toEqual({
      message: 'Avatar updated successfully',
      avatarUrl: uploadedImage.url,
      user: updatedUser,
    });

    expect(uploadsService.findImageByUrl).not.toHaveBeenCalled();
    expect(uploadsService.deleteImage).not.toHaveBeenCalled();
  });

  it('does not delete the newly uploaded image when previous avatar cleanup fails', async () => {
    const uploadedImage = {
      id: 'new-image-id',
      filename: 'new-avatar.png',
      url: '/uploads/images/new-avatar.png',
    };
    const previousAvatarUrl = '/uploads/images/old-avatar.png';
    const updatedUser = {
      id: 'user-id',
      email: 'user@example.com',
      username: 'user',
      displayName: null,
      avatarUrl: uploadedImage.url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const file = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('avatar'),
    } as Express.Multer.File;

    prisma.user.findUnique.mockResolvedValue({ avatarUrl: previousAvatarUrl });
    uploadsService.saveImage.mockResolvedValue(uploadedImage);
    uploadsService.findImageByUrl.mockRejectedValue(new Error('DB error'));
    prisma.user.update.mockResolvedValue(updatedUser);

    await expect(service.updateAvatar('user-id', file)).resolves.toEqual({
      message: 'Avatar updated successfully',
      avatarUrl: uploadedImage.url,
      user: updatedUser,
    });

    expect(uploadsService.findImageByUrl).toHaveBeenCalledWith(
      previousAvatarUrl,
    );
    expect(uploadsService.deleteImage).not.toHaveBeenCalled();
  });
});
