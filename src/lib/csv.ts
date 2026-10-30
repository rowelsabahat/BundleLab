import { MAX_IMPORTED_PRODUCTS, productSchema, type Product } from "./schemas";
export const CSV_HEADERS = [
  "id",
  "name",
  "category",
  "description",
  "retail_price",
  "cost",
  "stock",
  "tags",
  "currency",
];
export const SAMPLE_CSV =
  CSV_HEADERS.join(",") +
  '\nMY-001,Meadow Hand Balm,skincare,"A soft shea balm, made for daily use.",18.00,5.50,40,shea|hands,USD\nMY-002,Linen Bath Pouch,wellness,A reusable cotton pouch for bath salts.,12.00,3.20,30,bath|reusable,USD\n';
export type ImportError = { row: number; message: string };
export type ImportResult = { products: Product[]; errors: ImportError[] };
// Small RFC-style CSV reader: escaped quotes, quoted newlines, BOM, CRLF. No network or evaluation.
export function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  const input = text.replace(/^\uFEFF/, "");
  const endField = () => {
    row.push(field);
    field = "";
    closed = false;
  };
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += char;
    } else if (char === '"') {
      if (field || closed)
        throw new Error(
          "Unexpected quote. Quote the entire field and escape quotes with a double quote.",
        );
      quoted = true;
    } else if (char === ",") endField();
    else if (char === "\n" || char === "\r") {
      endField();
      rows.push(row);
      row = [];
      if (char === "\r" && input[i + 1] === "\n") i++;
    } else {
      if (closed) throw new Error("Unexpected text after a closing quote.");
      field += char;
    }
  }
  if (quoted) throw new Error("Unclosed quoted field.");
  if (field || row.length || closed) {
    endField();
    rows.push(row);
  }
  return rows;
}
function decimalCents(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return NaN;
  const [whole, fraction = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export function importCsv(
  text: string,
  existing: Product[],
  importedCount = 0,
): ImportResult {
  if (new TextEncoder().encode(text).length > 1_000_000)
    return {
      products: [],
      errors: [{ row: 0, message: "File must be 1 MB or smaller." }],
    };
  let rows: string[][];
  try {
    rows = readCsv(text);
  } catch (error) {
    return {
      products: [],
      errors: [
        {
          row: 0,
          message: error instanceof Error ? error.message : "Cannot read CSV.",
        },
      ],
    };
  }
  const headers = rows.shift()?.map((cell) => cell.trim());
  if (
    !headers ||
    headers.length !== CSV_HEADERS.length ||
    new Set(headers).size !== headers.length ||
    CSV_HEADERS.some((h) => !headers.includes(h))
  )
    return {
      products: [],
      errors: [
        { row: 1, message: `Headers must be: ${CSV_HEADERS.join(", ")}.` },
      ],
    };
  const errors: ImportError[] = [];
  const products: Product[] = [];
  const ids = new Set(existing.map((p) => p.id));
  rows.forEach((cells, index) => {
    if (cells.every((c) => !c.trim())) return;
    const row = index + 2;
    if (cells.length !== headers.length) {
      errors.push({
        row,
        message: "Wrong number of columns. Enclose commas in quotes.",
      });
      return;
    }
    const record = Object.fromEntries(
      headers.map((h, i) => [h, cells[i].trim()]),
    );
    const result = productSchema.safeParse({
      id: record.id,
      name: record.name,
      category: record.category,
      description: record.description,
      priceCents: decimalCents(record.retail_price),
      costCents: decimalCents(record.cost),
      stock: /^\d+$/.test(record.stock) ? Number(record.stock) : NaN,
      tags: record.tags.split("|").map((t) => t.trim()),
      currency: record.currency,
    });
    if (!result.success) {
      errors.push({
        row,
        message: result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
      return;
    }
    if (ids.has(result.data.id)) {
      errors.push({
        row,
        message: `ID “${result.data.id}” already exists. Use a unique ID; imports do not overwrite products.`,
      });
      return;
    }
    ids.add(result.data.id);
    products.push(result.data);
  });
  if (!products.length && !errors.length)
    errors.push({ row: 0, message: "The file contains no product rows." });
  if (products.length + importedCount > MAX_IMPORTED_PRODUCTS)
    errors.push({
      row: 0,
      message: `Keep at most ${MAX_IMPORTED_PRODUCTS} imported products. Clear saved imports before importing a replacement catalog.`,
    });
  return { products: errors.length ? [] : products, errors };
}
