import { FastifyInstance } from "fastify";
import { Webhooks } from "@polar-sh/fastify";
import { env } from "../../env";
import { parseCheckoutMetaData } from "../utils";
import logger from "../lib/logger";
import {
  createNewTicketFromPolarWebhook,
  updateTicketByReservationIdFromPolarWebhook,
} from "../modules/tickets/handlers/polar";

export function routes(fastify: FastifyInstance, opts: any) {
  fastify.post(
    "/webhooks",
    Webhooks({
      webhookSecret: env.POLAR_WEBHOOK_SECRET,
      onCheckoutUpdated: async function (payload) {
        const status = payload.data.status;
        const checkoutId = payload.data.id;
        const metadata = parseCheckoutMetaData(payload.data.metadata.meta);

        if (!metadata) {
          logger.error("polar/webhooks", "Failed to parse metadata", {
            operation: "onCheckoutUpdated",
            context: {
              metadata: payload.data.metadata,
            },
          });
          return;
        }
        const reservationId = metadata.reservation.id;
        switch (status) {
          case "open":
            createNewTicketFromPolarWebhook(
              {
                paymentStatus: "pending",
                reservationId,
                totalAmount: metadata.reservation.totalAmount,
                transactionId: checkoutId,
              },
              "onCheckoutUpdated",
              {
                status,
                metadata,
              }
            );
            return;
          case "confirmed":
            updateTicketByReservationIdFromPolarWebhook(
              reservationId,
              { paymentStatus: "processing" },
              "onCheckoutUpdated",
              { status, metadata }
            );
            return;
          default:
            logger.warn("polar/webhooks", "Unhandled checkout update", {
              operation: "onCheckoutUpdated",
              context: {
                status,
                metadata,
              },
            });
            return;
        }
      },
      onOrderUpdated: async function (payload) {
        const status = payload.data.status;
        const metadata = parseCheckoutMetaData(payload.data.metadata.meta);

        if (!metadata) {
          logger.error("polar/webhooks", "Failed to parse metadata", {
            operation: "onOrderUpdated",
            context: {
              metadata: payload.data.metadata,
            },
          });
          return;
        }

        const reservationId = metadata.reservation.id;
        switch (status) {
          case "paid":
            updateTicketByReservationIdFromPolarWebhook(
              reservationId,
              { paymentStatus: "paid" },
              "onOrderUpdated",
              { status, metadata }
            );
            return;
          case "refunded":
            updateTicketByReservationIdFromPolarWebhook(
              reservationId,
              { paymentStatus: "refunded" },
              "onOrderUpdated",
              { status, metadata }
            );
            return;
          default:
            logger.warn("polar/webhooks", "Unhandled order update", {
              operation: "onOrderUpdated",
              context: {
                status,
                metadata,
              },
            });
            return;
        }
      },
      // onRefundUpdated: async function (payload) {
      //   //
      // },
    })
  );
}
