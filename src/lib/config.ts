import { createClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';

// Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Redis client
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Redis connection for BullMQ
export const redisConnection = {
  host: process.env.UPSTASH_REDIS_REST_URL?.replace('https://', '').replace(':443', '') || 'localhost',
  port: 6379,
  password: process.env.UPSTASH_REDIS_REST_TOKEN,
  tls: process.env.UPSTASH_REDIS_REST_URL?.includes('https') ? {} : undefined,
};

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
export const QDRANT_URL = process.env.QDRANT_URL!;
export const QDRANT_API_KEY = process.env.QDRANT_API_KEY!;
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
