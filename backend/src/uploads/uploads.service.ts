import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { PrismaService } from '../prisma.service';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  IMAGE_UPLOAD_DIR,
  MAX_IMAGE_SIZE_BYTES,
  UPLOAD_URL_PREFIX,
} from './uploads.constants';

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveImage(file: Express.Multer.File) {
    this.validateImage(file);

    const uploadDir = resolve(process.cwd(), IMAGE_UPLOAD_DIR);
    await mkdir(uploadDir, { recursive: true });

    const extension = ALLOWED_IMAGE_EXTENSIONS[file.mimetype];
    const filename = `${randomUUID()}${extension}`;
    const destination = join(uploadDir, filename);
    const url = `${UPLOAD_URL_PREFIX}/${filename}`;

    await writeFile(destination, file.buffer);

    try {
      return await this.prisma.uploadedImage.create({
        data: {
          originalName: file.originalname,
          filename,
          mimeType: file.mimetype,
          size: file.size,
          url,
        },
      });
    } catch (error) {
      await unlink(destination).catch(() => undefined);
      throw error;
    }
  }

  private validateImage(file: Express.Multer.File) {
    if (!ALLOWED_IMAGE_EXTENSIONS[file.mimetype]) {
      throw new BadRequestException('file must be a jpeg, png, or webp image');
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('file must be 5MB or smaller');
    }
  }
}
