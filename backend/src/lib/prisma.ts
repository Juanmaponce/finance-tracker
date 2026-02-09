import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { config } from '../config/env';

const pool = new pg.Pool({ connectionString: config.database.url });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});
