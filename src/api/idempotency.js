// A sale or an installment payment is sent with an Idempotency-Key, so a retry of the SAME action (the
// reply was lost, the phone dropped signal mid-request) returns the original result instead of ringing the
// customer up twice. One key per user action: generate it when the action starts, reuse it while that same
// action is being retried, and drop it once it has succeeded or the cart/amount has changed.
export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}
