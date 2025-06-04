import "dotenv/config";
import Fastify from "fastify";
import { mountRoutes } from "./routes";

const fastify = Fastify({
  // logger: true,
});

fastify.register(mountRoutes, { prefix: "/api/v1" });

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  fastify.log.info(`server listening on ${address}`);
});
