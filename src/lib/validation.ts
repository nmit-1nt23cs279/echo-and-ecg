export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ECG_FEATURE_COUNT = 140;

export type UploadKind = "ecg_csv" | "ecg_image" | "echo_image";

const ALLOWED: Record<UploadKind, { ext: string[]; mime: string[] }> = {
  ecg_csv: { ext: ["csv"], mime: ["text/csv", "application/vnd.ms-excel", "text/plain", ""] },
  ecg_image: { ext: ["jpg", "jpeg", "png"], mime: ["image/jpeg", "image/png"] },
  echo_image: { ext: ["jpg", "jpeg", "png"], mime: ["image/jpeg", "image/png"] },
};

export function validateUploadFile(
  file: { name: string; size: number; type: string },
  kind: UploadKind,
): string | null {
  if (file.size <= 0) return "The file is empty.";
  if (file.size > MAX_UPLOAD_BYTES) return "Files must be 10 MB or smaller.";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const rule = ALLOWED[kind];
  if (!rule.ext.includes(ext)) return `Allowed file types: ${rule.ext.map((e) => "." + e).join(", ")}.`;
  if (!rule.mime.includes(file.type)) return "The file's format does not match its extension.";
  return null;
}

export function contentTypeFor(file: { name: string; type: string }, kind: UploadKind) {
  if (kind === "ecg_csv") return "text/csv";
  return file.type || "application/octet-stream";
}

export function safeFilename(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+/, "").slice(-120);
  return cleaned || "upload";
}

export type EcgParseResult = { ok: true; values: number[] } | { ok: false; error: string };

/**
 * Parses an ECG CSV with exactly one recording of 140 numeric features.
 * An optional single header row is allowed. Values are never padded, truncated or reordered.
 */
export function parseEcgCsv(text: string): EcgParseResult {
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
  if (rows.length === 0) return { ok: false, error: "The CSV file is empty." };

  const split = (r: string) => r.split(/[,;\t]/).map((c) => c.trim());
  const isNumeric = (c: string) => c !== "" && Number.isFinite(Number(c));

  let dataRows = rows;
  if (!split(rows[0]!).every(isNumeric)) dataRows = rows.slice(1);
  if (dataRows.length === 0) return { ok: false, error: "The CSV has a header but no data row." };
  if (dataRows.length > 1)
    return { ok: false, error: `Expected one ECG recording (one row); found ${dataRows.length} rows.` };

  const cells = split(dataRows[0]!);
  if (cells.length !== ECG_FEATURE_COUNT)
    return { ok: false, error: `Expected exactly ${ECG_FEATURE_COUNT} values; found ${cells.length}.` };
  const bad = cells.findIndex((c) => !isNumeric(c));
  if (bad !== -1) return { ok: false, error: `Value ${bad + 1} is not a finite number.` };
  return { ok: true, values: cells.map(Number) };
}
