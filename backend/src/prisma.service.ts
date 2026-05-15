import { Injectable } from '@nestjs/common';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('Environment variable DATABASE_URL is not set. Please set DATABASE_URL to your database connection string.');
    }

    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    });

    super({ adapter });
  }
}
