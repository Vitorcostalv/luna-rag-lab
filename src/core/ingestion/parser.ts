import { parse } from "csv-parse/sync";
import { normalize } from "@/core/rag/normalizer";
import { checksum } from "@/core/rag/embedder";
const cache = new Map<string, string>();
const types: Record<string, string[]> = {
  md: ["text/markdown", "text/plain", "application/octet-stream"],
  txt: ["text/plain"],
  json: ["application/json", "text/plain"],
  csv: ["text/csv", "application/vnd.ms-excel", "text/plain"],
  pdf: ["application/pdf"],
};
export async function parseDocument(
  name: string,
  mime: string,
  bytes: Uint8Array,
) {
  const extension = name.split(".").at(-1)?.toLowerCase() || "";
  if (!types[extension] || !types[extension].includes(mime))
    throw new Error("Unsupported file extension or MIME type");
  if (bytes.length > 5 * 1024 * 1024 || !bytes.length)
    throw new Error("Upload must be between 1 byte and 5 MB");
  const key = `${extension}:${checksum(Buffer.from(bytes).toString("base64"))}`;
  if (cache.has(key)) return cache.get(key)!;
  let text = new TextDecoder().decode(bytes);
  if (extension === "json") text = JSON.stringify(JSON.parse(text), null, 2);
  if (extension === "csv")
    text = JSON.stringify(
      parse(text, { columns: true, skip_empty_lines: true, bom: true }),
      null,
      2,
    );
  if (extension === "pdf") {
    if (!text.startsWith("%PDF-")) throw new Error("Invalid PDF signature");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }
  text = normalize(text);
  if (text.length > 2_000_000) throw new Error("Parsed text is too large");
  if (cache.size > 100) cache.clear();
  cache.set(key, text);
  return text;
}
