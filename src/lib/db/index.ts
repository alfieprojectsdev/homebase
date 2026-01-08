import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_mSiTwQe83sJV@ep-noisy-lab-a1cehoqc-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
);

export const db = drizzle(sql);
