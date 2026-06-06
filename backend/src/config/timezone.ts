// Pin the process timezone to IST so date-only / day-boundary logic (settlements,
// transaction days, the "future date" guard) matches the business (India)
// regardless of host timezone — Vercel serverless runs in UTC otherwise.
// Imported first (before any module that touches dates) so it takes effect early.
//
// Set UNCONDITIONALLY (not `|| 'Asia/Kolkata'`): Vercel/AWS Lambda pre-set
// TZ=UTC, so a `||` fallback would never fire and the fix would be a no-op.
// Node applies a runtime TZ reassignment to subsequent Date operations.
process.env.TZ = 'Asia/Kolkata';

export {};
