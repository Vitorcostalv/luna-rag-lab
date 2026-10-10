export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: Record<string, unknown>[]) {
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const escape = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [
    columns.map(escape).join(","),
    ...rows.map((r) => columns.map((k) => escape(r[k])).join(",")),
  ].join("\r\n");
}
