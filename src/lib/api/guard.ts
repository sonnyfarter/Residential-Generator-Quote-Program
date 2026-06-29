import { NextRequest, NextResponse } from "next/server";

// Lightweight abuse guards for the public API routes. Not a substitute for real
// auth, but blocks the common drive-by vectors for a single-tenant owner app:
//  - cross-site browser calls (Origin host must match the request host)
//  - rapid scripted hits (in-memory per-IP token bucket; resets per instance)
//  - oversized payloads (Content-Length cap)

const buckets = new Map<string, { count: number; reset: number }>();

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser callers (no Origin) — rate-limit handles them
  try {
    const host = req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > limit;
}

export interface GuardOpts {
  name: string;
  limit: number;
  windowMs: number;
  maxBytes: number;
}

/** Returns a NextResponse to short-circuit with, or null to proceed. */
export function guard(req: NextRequest, opts: GuardOpts): NextResponse | null {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  const len = Number(req.headers.get("content-length") || 0);
  if (len && len > opts.maxBytes) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }
  if (rateLimited(`${opts.name}:${clientIp(req)}`, opts.limit, opts.windowMs)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again shortly." }, { status: 429 });
  }
  return null;
}
