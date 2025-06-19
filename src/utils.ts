export function generateTicketId(): string {
  const timestamp = Date.now().toString(36); // Convert timestamp to base36
  const randomStr = Math.random().toString(36).substring(2, 7); // 5 random chars
  return `TKT-${timestamp}-${randomStr}`.toUpperCase();
}
