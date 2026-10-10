import { and, eq, gte, lte, inArray, sql, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { analytics, sites, devices } from "@/db/schema";
import { intentSchema } from "./intent";
import { requireAnalytics, type Access } from "@/core/agents/access-agent";
export async function executeAnalytics(raw: unknown, access: Access) {
  const intent = intentSchema.parse(raw);
  requireAnalytics(access, intent.dataset);
  const started = performance.now();
  const clauses = [eq(analytics.projectId, access.projectId)];
  const f = intent.filters;
  if (f.sites?.length) clauses.push(inArray(sites.name, f.sites));
  if (f.device) clauses.push(eq(analytics.deviceId, f.device));
  if (f.start) clauses.push(gte(analytics.day, f.start));
  if (f.end) clauses.push(lte(analytics.day, f.end));
  if (f.hourStart !== undefined) clauses.push(gte(analytics.hour, f.hourStart));
  if (f.hourEnd !== undefined) clauses.push(lte(analytics.hour, f.hourEnd));
  if (f.gender) clauses.push(eq(analytics.gender, f.gender));
  if (f.age) clauses.push(eq(analytics.age, f.age));
  if (intent.dataset === "devices") {
    const conditions = [eq(devices.projectId, access.projectId)];
    if (f.sites?.length) conditions.push(inArray(sites.name, f.sites));
    if (f.device) conditions.push(eq(devices.id, f.device));
    if (intent.aggregation === "COUNT") {
      const rows = await getDb()
        .select({ value: sql<number>`count(*)::float` })
        .from(devices)
        .innerJoin(sites, eq(sites.id, devices.siteId))
        .where(and(...conditions));
      return {
        tool: "AnalyticsTool",
        intent,
        rows,
        durationMs: performance.now() - started,
      };
    }
    const rows = await getDb()
      .select({
        device: devices.name,
        site: sites.name,
        asset: devices.asset,
        campaign: devices.campaign,
      })
      .from(devices)
      .innerJoin(sites, eq(sites.id, devices.siteId))
      .where(and(...conditions))
      .limit(intent.limit)
      .offset(intent.offset);
    return {
      tool: "AnalyticsTool",
      intent,
      rows,
      durationMs: performance.now() - started,
    };
  }
  if (intent.aggregation === "LIST" || intent.aggregation === "DETAIL") {
    const rows = await getDb()
      .select({
        site: sites.name,
        day: analytics.day,
        hour: analytics.hour,
        device: analytics.deviceId,
        gender: analytics.gender,
        age: analytics.age,
        value: analytics[intent.metric],
      })
      .from(analytics)
      .innerJoin(sites, eq(sites.id, analytics.siteId))
      .where(and(...clauses))
      .orderBy(analytics.day, analytics.hour, analytics.id)
      .limit(intent.aggregation === "DETAIL" ? 1 : intent.limit)
      .offset(intent.offset);
    return {
      tool: "AnalyticsTool",
      intent,
      rows,
      durationMs: performance.now() - started,
    };
  }
  const dimensionMap = {
    site: sites.name,
    device: analytics.deviceId,
    day: analytics.day,
    hour: analytics.hour,
    gender: analytics.gender,
    age: analytics.age,
  };
  const dims =
    intent.aggregation === "SUM" ||
    intent.aggregation === "AVG" ||
    intent.aggregation === "COUNT"
      ? []
      : [...new Set(intent.dimensions)];
  const metric = analytics[intent.metric];
  const average =
    intent.aggregation === "AVG" ||
    ["attention_time", "dwell_time", "percent_v"].includes(intent.metric);
  const value =
    intent.aggregation === "COUNT"
      ? sql<number>`count(*)::float`
      : average
        ? sql<number>`avg(${metric})::float`
        : sql<number>`sum(${metric})::float`;
  const dimensions = sql<
    Record<string, string | number>
  >`jsonb_build_object(${sql.join(
    dims.flatMap((d) => [sql`${d}::text`, sql`${dimensionMap[d]}`]),
    sql`, `,
  )})`;
  const query = getDb()
    .select({ dimensions, value })
    .from(analytics)
    .innerJoin(sites, eq(sites.id, analytics.siteId))
    .where(and(...clauses))
    .$dynamic();
  const grouped = dims.length
    ? query.groupBy(...dims.map((d) => dimensionMap[d]))
    : query;
  const rows = await grouped
    .orderBy(desc(value))
    .limit(intent.limit)
    .offset(intent.offset);
  return {
    tool: "AnalyticsTool",
    intent,
    rows,
    durationMs: performance.now() - started,
  };
}
