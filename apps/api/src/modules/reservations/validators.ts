import { findSeatsByHallId, findShowTimeByHallIdAndTime } from "./data";

export async function validateShowTime(hallId: number, time: Date) {
  const res = await findShowTimeByHallIdAndTime({ hallId, time });
  if (!res) {
    return null;
  }

  const now = Date.now();
  if (time.getTime() < now) return null;

  return res;
}

export async function validateRequestedSeats(seats: number[], hallId: number) {
  const res = await findSeatsByHallId({ seats, hallId });
  if (res.length < seats.length) {
    return false;
  }

  return true;
}
