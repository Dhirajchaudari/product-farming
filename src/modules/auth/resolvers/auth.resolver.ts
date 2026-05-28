import type { FastifyReply } from "fastify";

import { AUTH_SESSION_COOKIE } from "../auth.constants.js";
import type { SessionUser, UserRole } from "../interfaces/auth.types.js";
import { AuthService } from "../services/auth.service.js";

const authService = new AuthService();

function getRequiredUser(context: { sessionUser?: SessionUser | null }): SessionUser {
  if (!context.sessionUser) {
    throw new Error("UNAUTHENTICATED");
  }
  return context.sessionUser;
}

function requireRole(context: { sessionUser?: SessionUser | null }, expectedRole: UserRole): SessionUser {
  const user = getRequiredUser(context);
  if (user.role !== expectedRole) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

function setSessionCookie(reply: FastifyReply, sessionId: string): void {
  reply.setCookie(AUTH_SESSION_COOKIE, sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export const authResolvers = {
  Query: {
    authHealth: () => "ok",
    me: (_parent: unknown, _args: unknown, context: { sessionUser?: SessionUser | null }) => getRequiredUser(context),
    adminPing: (_parent: unknown, _args: unknown, context: { sessionUser?: SessionUser | null }) => {
      requireRole(context, "admin");
      return "pong";
    }
  },
  Mutation: {
    login: async (
      _parent: unknown,
      args: { email: string; role: UserRole },
      context: { reply: FastifyReply; sessionUser?: SessionUser | null }
    ) => {
      const { email, role } = args;
      const session = await authService.createSession(email, role);
      setSessionCookie(context.reply, session.sessionId);
      return session.user;
    },
    logout: async (
      _parent: unknown,
      _args: unknown,
      context: { reply: FastifyReply; sessionId?: string; sessionUser?: SessionUser | null }
    ) => {
      await authService.destroySession(context.sessionId);
      context.reply.clearCookie(AUTH_SESSION_COOKIE, { path: "/" });
      return true;
    }
  }
};

export async function resolveSessionUserFromCookie(sessionId: string | undefined): Promise<SessionUser | null> {
  return authService.resolveSession(sessionId);
}
