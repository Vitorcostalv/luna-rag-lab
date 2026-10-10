import { it, expect } from "vitest";
import { parseDocument } from "../../src/core/ingestion/parser";
function syntheticPdf() {
  const stream = "BT /F1 16 Tf 40 700 Td (Synthetic Luna document) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, "0")} 00000 n `)
    .join(
      "\n",
    )}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
it("extracts actual PDF text without executing document content", async () => {
  const parsed = await parseDocument(
    "synthetic.pdf",
    "application/pdf",
    syntheticPdf(),
  );
  expect(parsed).toContain("Synthetic Luna document");
});
it("rejects a misleading PDF signature", async () => {
  await expect(
    parseDocument(
      "bad.pdf",
      "application/pdf",
      new TextEncoder().encode("not a PDF"),
    ),
  ).rejects.toThrow("signature");
});
