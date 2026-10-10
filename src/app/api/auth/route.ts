import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { resultRows } from "@/db/rows";
import {
  ownerConfigured,
  ownerSession,
  sameOrigin,
  signSession,
  verifyPassword,
} from "@/core/security/session";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return Response.json({
    configured: ownerConfigured(),
    authenticated: ownerSession(request),
  });
}
export async function POST(request: Request) {
  if (!ownerConfigured())
    return Response.json(
      { error: "Owner authentication is not configured" },
      { status: 503 },
    );
  try {
    sameOrigin(request);
    const { password } = z
      .object({ password: z.string().min(1).max(512) })
      .strict()
      .parse(await request.json());
    // Shared database counter: one owner account, no spoofable IP or per-instance loophole.
    const windowKey = String(Math.floor(Date.now() / 600000));
    await getDb().execute(
      sql`create table if not exists luna_auth_limits (window_key text primary key, attempts integer not null)`,
    );
    const result = await getDb().execute(
      sql`insert into luna_auth_limits values (${windowKey},1) on conflict(window_key) do update set attempts=luna_auth_limits.attempts+1 returning attempts`,
    );
    if (Number((resultRows(result)[0] as { attempts?: number })?.attempts) > 10)
      return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
    if (!verifyPassword(password))
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    return Response.json(
      { authenticated: true },
      {
        headers: {
          "Set-Cookie": `luna_owner=${signSession()}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Authentication unavailable or invalid request" },
      { status: 400 },
    );
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    return Response.json(
      { authenticated: false },
      {
        headers: {
          "Set-Cookie":
            "luna_owner=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
        },
      },
    );
  } catch {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }
}
