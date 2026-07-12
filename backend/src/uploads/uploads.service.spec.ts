import { BadRequestException, Logger } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { PrismaService } from '../prisma.service';
import { MAX_IMAGE_SIZE_BYTES } from './uploads.constants';
import { UploadsService } from './uploads.service';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  unlink: jest.fn(),
  writeFile: jest.fn(),
}));

describe('UploadsService', () => {
  let service: UploadsService;
  let loggerWarnSpy: jest.SpyInstance;
  let prisma: {
    uploadedImage: {
      create: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
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
    loggerWarnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    prisma = {
      uploadedImage: {
        create: jest.fn().mockResolvedValue({ id: 'image-id' }),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    service = new UploadsService(prisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerWarnSpy.mockRestore();
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

  it('accepts a file at the exact size limit', async () => {
    const file = createFile(
      'image/png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    file.size = MAX_IMAGE_SIZE_BYTES;

    await expect(service.saveImage(file)).resolves.toEqual({ id: 'image-id' });
    expect(prisma.uploadedImage.create).toHaveBeenCalled();
  });

  it('rejects a file exceeding the size limit', async () => {
    const file = createFile(
      'image/png',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    file.size = MAX_IMAGE_SIZE_BYTES + 1;

    await expect(service.saveImage(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.uploadedImage.create).not.toHaveBeenCalled();
  });

  it('finds an uploaded image by URL', async () => {
    const image = {
      id: 'image-id',
      filename: 'avatar.png',
      url: '/uploads/images/avatar.png',
    };

    prisma.uploadedImage.findFirst.mockResolvedValue(image);

    await expect(service.findImageByUrl(image.url)).resolves.toBe(image);
    expect(prisma.uploadedImage.findFirst).toHaveBeenCalledWith({
      where: { url: image.url },
    });
  });

  it('deletes an uploaded image record and file', async () => {
    const image = { id: 'image-id', filename: 'avatar.png' };

    await expect(service.deleteImage(image)).resolves.toBeUndefined();

    expect(prisma.uploadedImage.delete).toHaveBeenCalledWith({
      where: { id: image.id },
    });
    expect(unlink).toHaveBeenCalled();
  });

  it('skips file deletion when uploaded image record deletion fails', async () => {
    const image = { id: 'image-id', filename: 'avatar.png' };
    prisma.uploadedImage.delete.mockRejectedValue(new Error('DB error'));

    await expect(service.deleteImage(image)).resolves.toBeUndefined();

    expect(unlink).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Failed to delete uploaded image record image-id: DB error',
    );
  });

  it('logs a warning when uploaded image file deletion fails', async () => {
    const image = { id: 'image-id', filename: 'avatar.png' };
    jest.mocked(unlink).mockRejectedValue(new Error('File error'));

    await expect(service.deleteImage(image)).resolves.toBeUndefined();

    expect(prisma.uploadedImage.delete).toHaveBeenCalledWith({
      where: { id: image.id },
    });
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Failed to unlink uploaded image file avatar.png: File error',
    );
  });
});
