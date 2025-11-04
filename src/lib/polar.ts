import { Polar } from "@polar-sh/sdk";
import { env } from "../../env";

export const polar = new Polar({
  accessToken: env.POLAR_TOKEN,
  server: "sandbox",
});
