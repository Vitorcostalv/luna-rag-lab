import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { embeddingCache } from "@/db/schema";
import { providers } from "@/ai/provider";
import { recordOtherTokens } from "@/core/security/quota";
export function checksum(text: string) {
  return createHash("sha256").update(text).digest("hex");
}
export class EmbeddingService {
  lastUsageTokens = 0;
  constructor(private userId?: string) {}
  async embedText(text: string) {
    return (await this.embedMany([text]))[0];
  }
  async embedMany(texts: string[]) {
    this.lastUsageTokens = 0;
    if (!texts.length) return [];
    const db = getDb(),
      provider = providers().embedding;
    const keys = texts.map((t) => checksum(`${provider.model}:${t}`));
    const existing = await db
      .select()
      .from(embeddingCache)
      .where(inArray(embeddingCache.checksum, keys));
    const cache = new Map(existing.map((e) => [e.checksum, e.embedding]));
    const missing = [...new Set(keys.filter((k) => !cache.has(k)))];
    for (let i = 0; i < missing.length; i += 64) {
      const batch = missing.slice(i, i + 64);
      const vectors = await provider.embedMany(
        batch.map((k) => texts[keys.indexOf(k)]),
      );
      this.lastUsageTokens += provider.usageTokens;
      if (this.userId)
        await recordOtherTokens(this.userId, provider.usageTokens);
      await db
        .insert(embeddingCache)
        .values(
          batch.map((key, j) => ({ checksum: key, embedding: vectors[j] })),
        )
        .onConflictDoNothing();
      batch.forEach((key, j) => cache.set(key, vectors[j]));
    }
    return keys.map((k) => cache.get(k)!);
  }
  async invalidate(text: string) {
    await getDb()
      .delete(embeddingCache)
      .where(
        eq(
          embeddingCache.checksum,
          checksum(`${providers().embedding.model}:${text}`),
        ),
      );
  }
}
