import { snapshotMode } from "@/core/security/session";
import { getDb } from "@/db/client";
import { sql } from "drizzle-orm";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  if (snapshotMode())
    return Response.json({
      available: true,
      mode: "snapshot",
      database: {
        status: process.env.DATABASE_URL
          ? "disabled_in_snapshot"
          : "not_configured",
        available: false,
      },
      version: "2.0.0",
      timestamp: new Date().toISOString(),
    });
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        getDb().execute(sql`select 1`),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error("Health timeout")), 5000);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
    return Response.json({
      available: true,
      mode: "live",
      database: { status: "connected", available: true },
      version: "2.0.0",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return Response.json(
      {
        available: false,
        mode: "live",
        database: { status: "unavailable", available: false },
        version: "2.0.0",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
