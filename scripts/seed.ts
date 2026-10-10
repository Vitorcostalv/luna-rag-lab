import "dotenv/config";
import { readFile, readdir } from "node:fs/promises";
import { getDb, closeDb } from "../src/db/client";
import {
  projects,
  users,
  memberships,
  sites,
  devices,
  analytics,
} from "../src/db/schema";
import { checkAccess } from "../src/core/agents/access-agent";
import { ingestDocument } from "../src/core/ingestion/ingest";
import { migrate } from "./migrate";
export const demoProject = "demo";
export async function seed() {
  if (process.env.AI_PROVIDER === "openai" && !process.env.OPENAI_API_KEY) {
    process.env.AI_PROVIDER = "mock";
    console.log(
      "No OpenAI key: seeding with explicitly labelled mock embeddings.",
    );
  }
  await migrate();
  const db = getDb();
  await db
    .insert(projects)
    .values([
      {
        id: "demo",
        name: "Synthetic Retail Observatory",
        slug: "demo",
        description: "Public synthetic analytics laboratory",
      },
      {
        id: "restricted",
        name: "Isolated permission fixture",
        slug: "restricted",
        description: "Synthetic access test",
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(users)
    .values(
      ["admin", "analytics", "retail", "viewer"].map((role) => ({
        id: role,
        name: `${role[0].toUpperCase() + role.slice(1)} Demo`,
        role,
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(memberships)
    .values(
      ["admin", "analytics", "retail", "viewer"].map((userId) => ({
        projectId: "demo",
        userId,
        permission: userId === "admin" ? "write" : "read",
      })),
    )
    .onConflictDoNothing();
  await db
    .insert(memberships)
    .values({ projectId: "restricted", userId: "admin", permission: "write" })
    .onConflictDoNothing();
  const names = [
    "Loja Centro",
    "Loja Norte",
    "Loja Sul",
    "Loja Oeste",
    "Loja Central SP",
    "Loja Central RJ",
  ];
  await db
    .insert(sites)
    .values(
      names.map((name, i) => ({ id: `site-${i}`, projectId: "demo", name })),
    )
    .onConflictDoNothing();
  const deviceData = names.flatMap((_, i) =>
    [0, 1].map((j) => ({
      id: `device-${i}-${j}`,
      projectId: "demo",
      siteId: `site-${i}`,
      name: `Sensor ${i + 1}.${j + 1}`,
      asset: `Painel ${j + 1}`,
      media: "display",
      campaign: `Campanha sintética ${(i % 2) + 1}`,
    })),
  );
  await db.insert(devices).values(deviceData).onConflictDoNothing();
  let state = 104729;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const dates = [
    ...Array.from(
      { length: 28 },
      (_, i) => `2026-04-${String(i + 1).padStart(2, "0")}`,
    ),
    ...Array.from(
      { length: 28 },
      (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`,
    ),
  ];
  const rows = dates.flatMap((day) =>
    deviceData.flatMap((device, i) =>
      Array.from({ length: 12 }, (_, h) => {
        const ots = 40 + Math.floor(random() * 160) + i * 7,
          observers = Math.floor(ots * 0.72),
          v = Math.floor(ots * 0.6),
          vd = Math.floor(v * (2 + random() * 5));
        return {
          id: `${day}-${device.id}-${h + 6}`,
          projectId: "demo",
          siteId: device.siteId,
          deviceId: device.id,
          day,
          hour: h + 6,
          gender: ["female", "male", "undefined"][(i + h) % 3],
          age: ["kid", "young", "adult", "senior", "undefined"][(i + h) % 5],
          ots,
          observers,
          v,
          vd,
          attention_time: vd / Math.max(v, 1),
          dwell_time: 8 + random() * 12,
          percent_v: (100 * v) / ots,
        };
      }),
    ),
  );
  for (let i = 0; i < rows.length; i += 500)
    await db
      .insert(analytics)
      .values(rows.slice(i, i + 500))
      .onConflictDoNothing();
  const access = await checkAccess("admin", "demo");
  for (const file of (await readdir("knowledge"))
    .filter((f) => f.endsWith(".md"))
    .sort()) {
    const content = await readFile(`knowledge/${file}`, "utf8");
    await ingestDocument(
      {
        title: content.match(/^# (.+)/)?.[1] || file,
        source: file,
        content,
        mimeType: "text/markdown",
      },
      access,
    );
  }
  await ingestDocument(
    {
      title: "Isolated synthetic secret",
      source: "isolated.md",
      content:
        "# Restricted fixture\nThe synthetic access sentinel is ORANGE-ISOLATED.",
      mimeType: "text/markdown",
    },
    await checkAccess("admin", "restricted"),
  );
  console.log(
    `Seed complete: ${names.length} sites, ${deviceData.length} devices, ${rows.length} analytics records. All data synthetic.`,
  );
}
if (process.argv[1]?.endsWith("seed.ts"))
  seed()
    .then(closeDb)
    .catch(async (error) => {
      console.error(error);
      await closeDb();
      process.exitCode = 1;
    });
