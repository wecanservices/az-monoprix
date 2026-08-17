import { NextResponse } from "next/server";

/**
 * Uniform API response shape: { data, error, meta? }.
 * Every route handler returns via `ok()` or `fail()`.
 */
export function ok<T>(data: T, meta?: Record<string, unknown>, init?: number) {
  return NextResponse.json({ data, error: null, meta }, { status: init ?? 200 });
}

export function fail(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { data: null, error: { code, message, details } },
    { status },
  );
}
