import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { PrismaService } from '../prisma.service';
import {
  ALLOWED_IMAGE_EXTENSIONS,
  IMAGE_UPLOAD_DIR,
  MAX_IMAGE_SIZE_BYTES,
  ORPHANED_IMAGE_LOG_PREFIX,
  UPLOAD_URL_PREFIX,
} from './uploads.constants';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

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

  async deleteImage(image: { id: string; filename: string }) {
    try {
      await this.prisma.uploadedImage.delete({
        where: { id: image.id },
      });
    } catch (error: unknown) {
      // レコード・実ファイルとも削除されず残る。自動リトライは無いため、
      // 復旧には運用者がこのログを見て手動対応する必要がある。
      this.logger.error(
        `${ORPHANED_IMAGE_LOG_PREFIX} Failed to delete uploaded image record ${image.id}: ${this.formatCleanupError(error)}`,
      );
      return;
    }

    const imagePath = resolve(process.cwd(), IMAGE_UPLOAD_DIR, image.filename);
    await unlink(imagePath).catch((error: unknown) => {
      // レコードは既に削除済みのため、DB からは追跡できない孤児ファイルになる。
      this.logger.error(
        `${ORPHANED_IMAGE_LOG_PREFIX} Failed to unlink uploaded image file ${image.filename}: ${this.formatCleanupError(error)}`,
      );
    });
  }

  async findImageByUrl(url: string) {
    return this.prisma.uploadedImage.findFirst({
      where: { url },
    });
  }

  private validateImage(file: Express.Multer.File) {
    if (!ALLOWED_IMAGE_EXTENSIONS[file.mimetype]) {
      throw new BadRequestException('file must be a jpeg, png, or webp image');
    }

    if (this.detectImageMimeType(file.buffer) !== file.mimetype) {
      throw new BadRequestException('file must be a jpeg, png, or webp image');
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('file must be 5MB or smaller');
    }
  }

  private detectImageMimeType(buffer: Buffer): string | null {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return 'image/jpeg';
    }

    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }

    return null;
  }

  private formatCleanupError(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
