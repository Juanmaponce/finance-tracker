import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  tls: redisUrl.includes('upstash.io') ? {} : undefined,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5) return null;
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

// Connect asynchronously - don't block server startup
redis.connect().catch((err) => {
  console.error('Redis initial connection failed:', err.message);
});
