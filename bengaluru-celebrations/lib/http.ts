import { NextResponse } from "next/server";
import { AppError, ValidationError } from "./errors";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(err: unknown) {
  if (err instanceof ValidationError) {
    return json({ error: { code: err.code, message: err.message, fields: err.fields } }, 400);
  }
  if (err instanceof AppError) {
    return json({ error: { code: err.code, message: err.message, ...(err.details ?? {}) } }, err.status);
  }
  console.error("[api] unexpected error", err);
  return json({ error: { code: "server_error", message: "Something went wrong on our side. Please try again." } }, 500);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) throw new AppError(415, "unsupported_media_type", "Expected JSON.");
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new AppError(400, "bad_json", "Malformed request.");
  }
}

/** Wrap a route handler so thrown AppErrors become JSON error responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

// Simple in-memory rate limiter (per server process). Use a shared store such as Redis when running several instances.
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return;
  }
  b.count++;
  if (b.count > max) throw new AppError(429, "rate_limited", "Too many attempts. Please wait a few minutes and try again.");
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
