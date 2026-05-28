import { randomUUID } from "node:crypto";

import { hash, compare } from "bcryptjs";
import { Redis } from "ioredis";

import { getPrismaClient } from "../../../utils/prisma.connection.js";
import type { SessionUser, UserRole } from "../interfaces/auth.types.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24;

export class AuthService {
  private readonly redis: Redis | null;
  private readonly memoryStore = new Map<string, SessionUser>();

  public constructor(redisClient: Redis | null = null) {
    this.redis = redisClient;
  }

  public async requestRegistrationOtp(email: string, role: UserRole, otpLength: number, otpTtlMinutes: number): Promise<string> {
    const code = this.generateOtpCode(otpLength);
    const expiresAt = new Date(Date.now() + otpTtlMinutes * 60 * 1000);
    const prisma = getPrismaClient();

    await prisma.authUser.upsert({
      where: { email },
      create: {
        email,
        role,
        isEmailVerified: false,
        firstLogin: true
      },
      update: {
        role
      }
    });

    await prisma.emailOtp.create({
      data: {
        email,
        code,
        role,
        purpose: "registration",
        expiresAt
      }
    });

    return code;
  }

  public async verifyRegistrationOtp(email: string, otp: string): Promise<boolean> {
    const prisma = getPrismaClient();
    const record = await prisma.emailOtp.findFirst({
      where: {
        email,
        code: otp,
        purpose: "registration",
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
    return Boolean(record);
  }

  public async setupPassword(email: string, otp: string, password: string): Promise<boolean> {
    const prisma = getPrismaClient();
    const record = await prisma.emailOtp.findFirst({
      where: {
        email,
        code: otp,
        purpose: "registration",
        consumedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!record) {
      return false;
    }

    const passwordHash = await hash(password, 10);
    await prisma.$transaction([
      prisma.authUser.update({
        where: { email },
        data: {
          passwordHash,
          isEmailVerified: true,
          firstLogin: true
        }
      }),
      prisma.emailOtp.update({
        where: { id: record.id },
        data: { consumedAt: new Date() }
      })
    ]);

    return true;
  }

  public async loginWithPassword(email: string, password: string): Promise<{ sessionId: string; user: SessionUser; firstLogin: boolean }> {
    const prisma = getPrismaClient();
    const authUser = await prisma.authUser.findUnique({
      where: { email }
    });

    if (!authUser || !authUser.passwordHash || !authUser.isEmailVerified) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const matches = await compare(password, authUser.passwordHash);
    if (!matches) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const session = await this.createSession(email, authUser.role as UserRole);
    await prisma.authUser.update({
      where: { email },
      data: {
        firstLogin: false
      }
    });

    return {
      ...session,
      firstLogin: authUser.firstLogin
    };
  }

  public async createSession(email: string, role: UserRole): Promise<{ sessionId: string; user: SessionUser }> {
    const user: SessionUser = {
      id: randomUUID(),
      email,
      role
    };
    const sessionId = randomUUID();

    if (this.redis) {
      const savedToRedis = await this.tryRedisSet(sessionId, user);
      if (!savedToRedis) {
        this.memoryStore.set(sessionId, user);
      }
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
      const payload = await this.tryRedisGet(sessionId);
      if (payload) {
        return JSON.parse(payload) as SessionUser;
      }
      return this.memoryStore.get(sessionId) ?? null;
    }

    return this.memoryStore.get(sessionId) ?? null;
  }

  public async destroySession(sessionId: string | undefined): Promise<void> {
    if (!sessionId) {
      return;
    }

    if (this.redis) {
      await this.tryRedisDel(sessionId);
      this.memoryStore.delete(sessionId);
      return;
    }

    this.memoryStore.delete(sessionId);
  }

  private toKey(sessionId: string): string {
    return `auth:session:${sessionId}`;
  }

  private generateOtpCode(length: number): string {
    const max = Math.pow(10, length) - 1;
    const min = Math.pow(10, length - 1);
    return String(Math.floor(min + Math.random() * (max - min + 1)));
  }

  private async ensureRedisConnected(): Promise<void> {
    if (!this.redis) {
      return;
    }

    // ioredis status can be one of: wait, connecting, connect, ready, close, end, reconnecting
    if (this.redis.status === "wait" || this.redis.status === "end") {
      await this.redis.connect();
    }
  }

  private async tryRedisSet(sessionId: string, user: SessionUser): Promise<boolean> {
    if (!this.redis) {
      return false;
    }
    try {
      await this.ensureRedisConnected();
      await this.redis.set(this.toKey(sessionId), JSON.stringify(user), "EX", SESSION_TTL_SECONDS);
      return true;
    } catch (error) {
      this.logRedisWarning("set", error);
      return false;
    }
  }

  private async tryRedisGet(sessionId: string): Promise<string | null> {
    if (!this.redis) {
      return null;
    }
    try {
      await this.ensureRedisConnected();
      return await this.redis.get(this.toKey(sessionId));
    } catch (error) {
      this.logRedisWarning("get", error);
      return null;
    }
  }

  private async tryRedisDel(sessionId: string): Promise<void> {
    if (!this.redis) {
      return;
    }
    try {
      await this.ensureRedisConnected();
      await this.redis.del(this.toKey(sessionId));
    } catch (error) {
      this.logRedisWarning("del", error);
    }
  }

  private logRedisWarning(operation: string, error: unknown): void {
    const details = error instanceof Error ? error.message : String(error);
    console.warn(`[auth] redis ${operation} failed, using memory fallback: ${details}`);
  }
}
