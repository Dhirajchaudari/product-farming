import { type MiddlewareFn } from "type-graphql";

import type { UserRole } from "../modules/auth/interfaces/auth.types.js";
import type Context from "../types/context.type.js";

export function requireRole(expectedRole: UserRole): MiddlewareFn<Context> {
  return async ({ context }, next) => {
    if (!context.sessionUser) {
      throw new Error("UNAUTHENTICATED");
    }
    if (context.sessionUser.role !== expectedRole) {
      throw new Error("FORBIDDEN");
    }
    return next();
  };
}

export const isAdmin = requireRole("admin");
