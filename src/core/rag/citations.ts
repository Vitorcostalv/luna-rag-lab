import type { Source } from "./types";
export function validateCitations(answer: string, sources: Source[]) {
  const valid = new Set(sources.map((s) => s.sourceId));
  const invalid: string[] = [];
  const text = answer.replace(/\[(S\d+)\]/g, (match, id: string) => {
    if (valid.has(id)) return match;
    invalid.push(id);
    return "";
  });
  return { text, invalid, cited: [...new Set(text.match(/\[S\d+\]/g) || [])] };
}
