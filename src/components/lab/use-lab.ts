"use client";
import { useEffect, useState, useCallback } from "react";
import type { RunResult } from "@/core/orchestrator";
export type DocumentSummary = {
  id: string;
  title: string;
  source: string;
  status: string;
  chunkCount: number;
  tokens: number;
  createdAt: string;
  metadata: Record<string, unknown>;
};
export type LabData = {
  users: { id: string; name: string; role: string }[];
  projects: { id: string; name: string }[];
  documents: DocumentSummary[];
  chunkTotal: number;
  runs: {
    id: string;
    query: string;
    mode: string;
    durationMs: number;
    createdAt: string;
    result: RunResult;
  }[];
  evaluations: {
    id: string;
    summary: Record<string, number>;
    results: {
      id: string;
      question: string;
      passed: boolean;
      metrics: { mrr: number | null };
    }[];
    createdAt: string;
  }[];
  quota: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    otherTokens: number;
    cycleStart: string;
  }[];
  provider: string;
};
export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}
export function useLab() {
  const [userId, setUserId] = useState("admin"),
    [projectId, setProjectId] = useState("demo"),
    [data, setData] = useState<LabData>(),
    [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      setData(
        await fetchJson<LabData>(
          `/api/lab?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`,
        ),
      );
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [userId, projectId]);
  useEffect(() => {
    let cancelled = false;
    fetchJson<LabData>(
      `/api/lab?userId=${encodeURIComponent(userId)}&projectId=${encodeURIComponent(projectId)}`,
    )
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, projectId]);
  return {
    userId,
    projectId,
    setUserId,
    setProjectId,
    data,
    error,
    reload,
    identity: { userId, projectId },
  };
}
export type Lab = ReturnType<typeof useLab>;
