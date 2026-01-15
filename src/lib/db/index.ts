import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = neon(process.env.DATABASE_URL, {
  fetchOptions: {
    cache: 'no-store',
    timeout: 10000,
  },
});

import * as schema from './schema';

export const db = drizzle(sql, { schema });