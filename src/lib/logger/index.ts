/**
 * Structured logger — used by services + API. Never logs PII.
 * In dev it's console.log; wrap this with pino/otel later.
 */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, msg: string, meta?: Record<string, unknown>) {
  if (typeof window !== "undefined") return;
  const line = { ts: new Date().toISOString(), level, msg, ...meta };
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";
  // eslint-disable-next-line no-console
  console[method](JSON.stringify(line));
}

export const log = {
  debug: (m: string, meta?: Record<string, unknown>) => emit("debug", m, meta),
  info:  (m: string, meta?: Record<string, unknown>) => emit("info",  m, meta),
  warn:  (m: string, meta?: Record<string, unknown>) => emit("warn",  m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit("error", m, meta),
};
