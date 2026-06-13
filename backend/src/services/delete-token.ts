import { createHmac, timingSafeEqual } from "node:crypto";

import { HttpError } from "../errors/http-error.js";

const TOKEN_VERSION = "v1";

function signImageId(id: string, secret: string): string {
  return createHmac("sha256", secret).update(`${TOKEN_VERSION}:${id}`).digest("base64url");
}

export function createDeleteToken(id: string, secret: string): string {
  return `${TOKEN_VERSION}.${signImageId(id, secret)}`;
}

export function verifyDeleteToken(id: string, token: string | undefined, secret: string): void {
  if (!token) {
    throw new HttpError(401, "missing_delete_token", "A delete token is required.");
  }

  const expected = createDeleteToken(id, secret);
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expected);

  if (tokenBuffer.length !== expectedBuffer.length || !timingSafeEqual(tokenBuffer, expectedBuffer)) {
    throw new HttpError(403, "invalid_delete_token", "The delete token is invalid for this image.");
  }
}
