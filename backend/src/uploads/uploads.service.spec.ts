import { BadRequestException } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { PrismaService } from '../prisma.service';
import { UploadsService } from './uploads.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
}));

describe('UploadsService', () => {
  let service: UploadsService;
  let prisma: {
    uploadedImage: {
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  const createFile = (mimetype: string, buffer: Buffer): Express.Multer.File =>
    ({
      originalname: 'avatar.png',
      mimetype,
      size: buffer.length,
      buffer,
    }) as Express.Multer.File;

  beforeEach(() => {
    jest.mocked(mkdir).mockResolvedValue(undefined);
    jest.mocked(unlink).mockResolvedValue(undefined);
    jest.mocked(writeFile).mockResolvedValue(undefined);

    prisma = {
      uploadedImage: {
        create: jest.fn().mockResolvedValue({ id: 'image-id' }),
        delete: jest.fn(),
      },
    };

    service = new UploadsService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'image/png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ],
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ['image/webp', Buffer.from('RIFF\x00\x00\x00\x00WEBP', 'binary')],
  ])(
    'accepts %s when the buffer signature matches',
    async (mimetype, buffer) => {
      await expect(
        service.saveImage(createFile(mimetype, buffer)),
      ).resolves.toEqual({ id: 'image-id' });

      expect(prisma.uploadedImage.create).toHaveBeenCalled();
    },
  );

  it('rejects a spoofed MIME type when the buffer signature does not match', async () => {
    const file = createFile('image/png', Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

    await expect(service.saveImage(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.uploadedImage.create).not.toHaveBeenCalled();
  });

  it('rejects unknown image bytes', async () => {
    const file = createFile('image/png', Buffer.from('not an image'));

    await expect(service.saveImage(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.uploadedImage.create).not.toHaveBeenCalled();
  });
});
