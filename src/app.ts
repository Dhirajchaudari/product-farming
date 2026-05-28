import "reflect-metadata";

import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import mercurius from "mercurius";
import { buildSchemaSync } from "type-graphql";

import { AUTH_SESSION_COOKIE } from "./modules/auth/auth.constants.js";
import { AuthResolver, resolveSessionUserFromCookie } from "./modules/auth/resolvers/auth.resolver.js";
import { EmployeeResolver } from "./modules/employee/resolvers/employee.resolver.js";
import { closeQueues, initializeQueues } from "./queue/index.queue.js";
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

  void app.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS_ORIGIN_NOT_ALLOWED"), false);
    }
  });

  void app.register(cookie);

  const gqlSchema = buildSchemaSync({
    resolvers: [AuthResolver, EmployeeResolver],
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

  if (env.nodeEnv !== "test") {
    app.addHook("onReady", async () => {
      const queueStatus = await initializeQueues();
      if (queueStatus.initialized) {
        app.log.info({ queueStatus }, "Queues initialized");
      } else {
        app.log.warn({ queueStatus }, "Queues unavailable; continuing without workers");
      }
    });

    app.addHook("onClose", async () => {
      await closeQueues();
    });
  }

  return app;
}
