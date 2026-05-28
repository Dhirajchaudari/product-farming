import { randomUUID } from "node:crypto";

import type { FastifyReply } from "fastify";
import { Arg, Ctx, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import { isAdmin } from "../../../middlewares/authorization.js";
import { enqueueAuthAudit, enqueueCommunicationEmail } from "../../../queue/index.queue.js";
import type Context from "../../../types/context.type.js";
import { EmailTemplateType } from "../../../utils/constants/emails.constant.js";
import { getEnvConfig } from "../../../utils/env.config.js";
import { getRedisClient } from "../../../utils/redis.connection.js";
import { AUTH_SESSION_COOKIE } from "../auth.constants.js";
import type { SessionUser } from "../interfaces/auth.types.js";
import { UserRoleEnum } from "../interfaces/auth.types.js";
import { AuthService } from "../services/auth.service.js";
import { AuthOperationResultType, SessionUserType } from "../schema/auth.schema.js";

const env = getEnvConfig();
const testAuthService = new AuthService(null);
let redisAuthService: AuthService | null = null;

function getAuthService(): AuthService {
  if (process.env.VITEST === "true" || getEnvConfig().nodeEnv === "test") {
    return testAuthService;
  }
  if (!redisAuthService) {
    redisAuthService = new AuthService(getRedisClient());
  }
  return redisAuthService;
}

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
    const session = { ...(await getAuthService().createSession(randomUUID(), email, role)), firstLogin: false };
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
    await enqueueAuthAudit("auth-login", {
      event: "login",
      userId: session.user.id,
      email: session.user.email,
      at: new Date().toISOString()
    });
    if (session.firstLogin) {
      await enqueueCommunicationEmail("auth-login-welcome-email", {
        type: EmailTemplateType.USER_ONBOARDING,
        data: {
          userId: session.user.id,
          email: session.user.email
        }
      });
    }
    return session.user;
  }

  @Mutation(() => SessionUserType)
  public async loginWithPassword(
    @Ctx() context: Context,
    @Arg("email", () => String) email: string,
    @Arg("password", () => String) password: string
  ): Promise<SessionUser> {
    const session = await getAuthService().loginWithPassword(email, password);
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
    await enqueueAuthAudit("auth-login-password", {
      event: "login",
      userId: session.user.id,
      email: session.user.email,
      at: new Date().toISOString()
    });
    if (session.firstLogin) {
      await enqueueCommunicationEmail("auth-login-welcome-email", {
        type: EmailTemplateType.USER_ONBOARDING,
        data: {
          userId: session.user.id,
          email: session.user.email
        }
      });
    }
    return session.user;
  }

  @Mutation(() => AuthOperationResultType)
  public async requestRegistrationOtp(
    @Arg("email", () => String) email: string,
    @Arg("role", () => UserRoleEnum, { nullable: true }) role?: UserRoleEnum
  ): Promise<AuthOperationResultType> {
    const otpCode = await getAuthService().requestRegistrationOtp(
      email,
      role ?? UserRoleEnum.hr_manager,
      env.otpLength,
      env.otpTtlMinutes
    );

    await enqueueCommunicationEmail("registration-otp", {
      type: EmailTemplateType.EMAIL_VERIFICATION_OTP,
      data: {
        email,
        otpCode
      }
    });

    return {
      success: true,
      message: "OTP_SENT"
    };
  }

  @Mutation(() => AuthOperationResultType)
  public async verifyRegistrationOtp(
    @Arg("email", () => String) email: string,
    @Arg("otp", () => String) otp: string
  ): Promise<AuthOperationResultType> {
    const valid = await getAuthService().verifyRegistrationOtp(email, otp);
    return {
      success: valid,
      message: valid ? "OTP_VALID" : "OTP_INVALID_OR_EXPIRED"
    };
  }

  @Mutation(() => AuthOperationResultType)
  public async setupPassword(
    @Arg("email", () => String) email: string,
    @Arg("otp", () => String) otp: string,
    @Arg("password", () => String) password: string
  ): Promise<AuthOperationResultType> {
    if (password.length < env.passwordMinLength) {
      return {
        success: false,
        message: "PASSWORD_TOO_SHORT"
      };
    }

    const success = await getAuthService().setupPassword(email, otp, password);
    return {
      success,
      message: success ? "PASSWORD_SET" : "OTP_INVALID_OR_EXPIRED"
    };
  }

  @Mutation(() => Boolean)
  public async logout(@Ctx() context: Context): Promise<boolean> {
    if (context.sessionUser) {
      await enqueueAuthAudit("auth-logout", {
        event: "logout",
        userId: context.sessionUser.id,
        email: context.sessionUser.email,
        at: new Date().toISOString()
      });
    }
    await getAuthService().destroySession(context.sessionId);
    const reply = (context as unknown as { reply?: FastifyReply; appReply?: FastifyReply }).reply
      ?? (context as unknown as { appReply?: FastifyReply }).appReply;
    if (reply) {
      reply.clearCookie(AUTH_SESSION_COOKIE, { path: "/" });
    }
    return true;
  }
}

export async function resolveSessionUserFromCookie(sessionId: string | undefined): Promise<SessionUser | null> {
  return getAuthService().resolveSession(sessionId);
}

export function resetAuthStateForTests(): void {
  testAuthService.clearSessionsForTests();
}
