import { existsSync } from "node:fs";
import path from "node:path";

import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import staticPlugin from "@fastify/static";
import fastify, { type FastifyInstance, type FastifyReply } from "fastify";

import { type AppConfig } from "./config/env.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import { registerImageRoutes } from "./routes/images.js";

export async function createServer(config: AppConfig): Promise<FastifyInstance> {
  const app = fastify({
    bodyLimit: config.maxUploadBytes,
    logger: {
      level: config.nodeEnv === "test" ? "silent" : "info"
    }
  });

  await app.register(cors, {
    allowedHeaders: ["content-type", "x-delete-token"],
    methods: ["GET", "HEAD", "POST", "DELETE", "OPTIONS"],
    origin: config.nodeEnv === "production" ? config.allowedOrigins : true
  });
  await app.register(multipart, {
    limits: {
      fileSize: config.maxUploadBytes,
      files: 1
    }
  });

  registerErrorHandler(app);
  await registerImageRoutes(app, config);

  const staticRoot = path.join(process.cwd(), "out");

  if (config.nodeEnv === "production" && existsSync(staticRoot)) {
    await app.register(staticPlugin, {
      prefix: "/",
      root: staticRoot
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        sendNotFound(reply);
        return;
      }

      void reply.sendFile("index.html");
    });
  } else {
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        sendNotFound(reply);
        return;
      }

      void reply.status(404).send({
        error: {
          code: "not_found",
          message: "Route not found."
        }
      });
    });
  }

  return app;
}

function sendNotFound(reply: FastifyReply): void {
  void reply.status(404).send({
    error: {
      code: "not_found",
      message: "API route not found."
    }
  });
}
