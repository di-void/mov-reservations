import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  type NewRefundRequest,
  type RefundRequest,
  refundRequests,
} from "../../db/schema";

export async function insertNewRefundRequest(
  data: Omit<NewRefundRequest, "status">
) {
  return db
    .insert(refundRequests)
    .values({ ...data, status: "pending" })
    .returning()
    .then((r) => r.at(0));
}

export async function updateRefundRequestByIdAndUserId(
  filter: { id: number; userId: number },
  data: Partial<RefundRequest>
) {
  return db
    .update(refundRequests)
    .set({ ...data })
    .where(
      and(
        eq(refundRequests.id, filter.id),
        eq(refundRequests.userId, filter.userId)
      )
    )
    .returning()
    .then((r) => r.at(0));
}
