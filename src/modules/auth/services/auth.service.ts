import { randomUUID } from "node:crypto";

import { Redis } from "ioredis";

import type { SessionUser, UserRole } from "../interfaces/auth.types.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24;

export class AuthService {
  private readonly redis: Redis | null;
  private readonly memoryStore = new Map<string, SessionUser>();

  public constructor(redisUrl: string | undefined = process.env.REDIS_URL) {
    this.redis = redisUrl ? new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 }) : null;
  }

  public async createSession(email: string, role: UserRole): Promise<{ sessionId: string; user: SessionUser }> {
    const user: SessionUser = {
      id: randomUUID(),
      email,
      role
    };
    const sessionId = randomUUID();

    if (this.redis) {
      await this.redis.connect();
      await this.redis.set(this.toKey(sessionId), JSON.stringify(user), "EX", SESSION_TTL_SECONDS);
    } else {
      this.memoryStore.set(sessionId, user);
    }

    return { sessionId, user };
  }

  public async resolveSession(sessionId: string | undefined): Promise<SessionUser | null> {
    if (!sessionId) {
      return null;
    }

    if (this.redis) {
      await this.redis.connect();
      const payload = await this.redis.get(this.toKey(sessionId));
      if (!payload) {
        return null;
      }
      return JSON.parse(payload) as SessionUser;
    }

    return this.memoryStore.get(sessionId) ?? null;
  }

  public async destroySession(sessionId: string | undefined): Promise<void> {
    if (!sessionId) {
      return;
    }

    if (this.redis) {
      await this.redis.connect();
      await this.redis.del(this.toKey(sessionId));
      return;
    }

    this.memoryStore.delete(sessionId);
  }

  private toKey(sessionId: string): string {
    return `auth:session:${sessionId}`;
  }
}
