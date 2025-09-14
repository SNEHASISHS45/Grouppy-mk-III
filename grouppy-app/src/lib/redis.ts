import Redis from "ioredis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (!url) return null;
  if (!client) {
    client = new Redis(url, {
      // Upstash is serverless-friendly; these options are also safe for others
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableAutoPipelining: true,
    });
    // Avoid unhandled rejections in dev
    client.on("error", () => {});
  }
  return client;
}

export async function redisGetJSON<T = any>(key: string): Promise<{ data: T; storedAt: number } | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as { data: T; storedAt: number };
  } catch {
    return null;
  }
}

export async function redisSetJSON<T = any>(key: string, value: { data: T; storedAt: number }, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // ignore
  }
}
