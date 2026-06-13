import { getConfig } from "./config/env.js";
import { createServer } from "./server.js";

const config = getConfig();
const app = await createServer(config);

try {
  await app.listen({
    host: "0.0.0.0",
    port: config.port
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
