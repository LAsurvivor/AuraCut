import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { isHttpError } from "../errors/http-error.js";

type ErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

function sendError(reply: FastifyReply, statusCode: number, code: string, message: string): void {
  void reply.status(statusCode).send({
    error: {
      code,
      message
    }
  } satisfies ErrorResponse);
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, _request: FastifyRequest, reply: FastifyReply) => {
    const errorCode = "code" in error ? error.code : undefined;

    if (errorCode === "FST_INVALID_MULTIPART_CONTENT_TYPE") {
      sendError(reply, 400, "missing_file", "Please upload one image file as multipart form data.");
      return;
    }

    if (errorCode === "FST_FILES_LIMIT") {
      sendError(reply, 400, "too_many_files", "Please upload only one image file.");
      return;
    }

    if (errorCode === "FST_REQ_FILE_TOO_LARGE") {
      sendError(reply, 413, "file_too_large", "The selected image is larger than the allowed upload size.");
      return;
    }

    if (isHttpError(error)) {
      sendError(reply, error.statusCode, error.code, error.message);
      return;
    }

    app.log.error(error);
    sendError(reply, 500, "internal_error", "Something went wrong while processing the image.");
  });
}
