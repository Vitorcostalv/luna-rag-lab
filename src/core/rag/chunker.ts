import { normalize, tokenCount } from "./normalizer";
export type TextChunk = {
  content: string;
  heading: string;
  chunkIndex: number;
  tokenCount: number;
  start: number;
  end: number;
};
export function chunkText(raw: string, size = 700, overlap = 120): TextChunk[] {
  if (!Number.isInteger(size) || size < 20 || overlap < 0 || overlap >= size)
    throw new Error("Overlap must be smaller than chunk size (minimum 20).");
  const text = normalize(raw),
    max = size * 4,
    shared = overlap * 4;
  const headings = [...text.matchAll(/^#{1,6} (.+)$/gm)].map((m) => ({
    index: m.index,
    title: m[1],
  }));
  const result: TextChunk[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + max, text.length);
    if (end < text.length) {
      const heading = headings
        .filter((h) => h.index > start + max * 0.5 && h.index <= end)
        .at(-1);
      const paragraph = text.lastIndexOf("\n\n", end);
      const space = text.lastIndexOf(" ", end);
      end =
        heading?.index ??
        (paragraph > start + max * 0.5
          ? paragraph
          : space > start
            ? space
            : end);
    }
    const content = text.slice(start, end).trim();
    if (content)
      result.push({
        content,
        heading:
          headings.filter((h) => h.index <= start).at(-1)?.title ||
          headings[0]?.title ||
          "",
        chunkIndex: result.length,
        tokenCount: tokenCount(content),
        start,
        end,
      });
    if (end === text.length) break;
    start = Math.max(start + 1, end - shared);
  }
  return result;
}
