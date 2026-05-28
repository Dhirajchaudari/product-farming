import type { FastifyReply } from "fastify";
import { Arg, Ctx, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import { isAdmin } from "../../../middlewares/authorization.js";
import type Context from "../../../types/context.type.js";
import { getEnvConfig } from "../../../utils/env.config.js";
import { getRedisClient } from "../../../utils/redis.connection.js";
import { AUTH_SESSION_COOKIE } from "../auth.constants.js";
import type { SessionUser } from "../interfaces/auth.types.js";
import { AuthService } from "../services/auth.service.js";
import { SessionUserType, UserRoleEnum } from "../schema/auth.schema.js";

const env = getEnvConfig();
const authService = new AuthService(env.nodeEnv === "test" ? null : getRedisClient());

@Resolver(() => SessionUserType)
export class AuthResolver {
  @Query(() => String)
  public authHealth(): string {
    return "ok";
  }

  @Query(() => SessionUserType, { nullable: true })
  @UseMiddleware(isAuthenticated)
  public me(@Ctx() context: Context): SessionUser | null {
    return context.sessionUser;
  }

  @Query(() => String, { nullable: true })
  @UseMiddleware(isAuthenticated, isAdmin)
  public adminPing(): string {
    return "pong";
  }

  @Mutation(() => SessionUserType)
  public async login(
    @Ctx() context: Context,
    @Arg("email", () => String) email: string,
    @Arg("role", () => UserRoleEnum) role: UserRoleEnum
  ) {
    const session = await authService.createSession(email, role);
    const reply = (context as unknown as { reply?: FastifyReply; appReply?: FastifyReply }).reply
      ?? (context as unknown as { appReply?: FastifyReply }).appReply;
    if (!reply) {
      throw new Error("CONTEXT_REPLY_MISSING");
    }
    reply.setCookie(AUTH_SESSION_COOKIE, session.sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: env.nodeEnv === "production"
    });
    return session.user;
  }

  @Mutation(() => Boolean)
  public async logout(@Ctx() context: Context): Promise<boolean> {
    await authService.destroySession(context.sessionId);
    const reply = (context as unknown as { reply?: FastifyReply; appReply?: FastifyReply }).reply
      ?? (context as unknown as { appReply?: FastifyReply }).appReply;
    if (reply) {
      reply.clearCookie(AUTH_SESSION_COOKIE, { path: "/" });
    }
    return true;
  }
}

export async function resolveSessionUserFromCookie(sessionId: string | undefined): Promise<SessionUser | null> {
  return authService.resolveSession(sessionId);
}
