import "reflect-metadata";

import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import mercurius from "mercurius";
import { buildSchemaSync } from "type-graphql";

import { AUTH_SESSION_COOKIE } from "./modules/auth/auth.constants.js";
import { AuthResolver, resolveSessionUserFromCookie } from "./modules/auth/resolvers/auth.resolver.js";
import { getEnvConfig } from "./utils/env.config.js";

export function buildApp(): FastifyInstance {
  const env = getEnvConfig();
  const app = Fastify({
    logger: true
  });

  app.get("/health", async () => {
    return {
      status: "ok",
      service: "product-farming-server",
      timestamp: new Date().toISOString()
    };
  });

  void app.register(cookie);

  const gqlSchema = buildSchemaSync({
    resolvers: [AuthResolver],
    validate: false
  });

  void app.register(mercurius as any, {
    schema: gqlSchema,
    graphiql: env.nodeEnv !== "production",
    path: "/graphql",
    context: async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = request.cookies[AUTH_SESSION_COOKIE];
      const sessionUser = await resolveSessionUserFromCookie(sessionId);
      return {
        request,
        reply,
        appReply: reply,
        sessionId,
        sessionUser
      };
    }
  });

  return app;
}
