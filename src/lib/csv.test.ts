import { describe, expect, it } from "vitest";
import { CSV_HEADERS, SAMPLE_CSV, importCsv, readCsv } from "./csv";
import { seedProducts } from "./catalog";
const csv = (...rows: string[]) => [CSV_HEADERS.join(","), ...rows].join("\n");
const valid =
  "IMPORT-1,New Balm,skincare,A gentle balm.,0.29,0.10,10,shea|daily,USD";
describe("CSV ingestion", () => {
  it("accepts the downloadable sample", () => {
    const result = importCsv(SAMPLE_CSV, seedProducts);
    expect(result.errors).toEqual([]);
    expect(result.products).toHaveLength(2);
  });
  it("reads BOM, CRLF, embedded commas, escaped quotes and multiline descriptions", () => {
    const result = importCsv(
      "\uFEFF" +
        csv(
          'IMPORT-1,"Balm, soft",skincare,"A ""soft"" balm\nfor hands.",0.29,0.10,10,shea,USD',
        ).replace(/\n/g, "\r\n"),
      [],
    );
    expect(result.errors).toEqual([]);
    expect(result.products[0].description).toContain('"soft"');
    expect(result.products[0].priceCents).toBe(29);
  });
  it.each(["-1", "1.001", "NaN", "Infinity", "$2.00", "1e2", ""])(
    "rejects invalid dollar input %s atomically with a row error",
    (price) => {
      const result = importCsv(
        csv(valid, `IMPORT-2,Balm,skincare,A balm.,${price},0.00,1,shea,USD`),
        [],
      );
      expect(result.products).toEqual([]);
      expect(result.errors[0].row).toBe(3);
    },
  );
  it("accepts zero prices, zero stock and costs higher than retail", () => {
    expect(
      importCsv(csv(valid.replace("0.29,0.10,10", "0.00,1.00,0")), []).errors,
    ).toEqual([]);
  });
  it("rejects IDs already present in seed, imported data, or this file", () => {
    expect(
      importCsv(csv(valid.replace("IMPORT-1", "BL-001")), seedProducts)
        .errors[0].message,
    ).toContain("already exists");
    expect(importCsv(csv(valid, valid), []).errors[0].row).toBe(3);
    const imported = importCsv(csv(valid), []).products;
    expect(importCsv(csv(valid), imported).products).toEqual([]);
  });
  it.each([
    "Balm,skincare,A balm.,1,0,1,shea",
    "Balm,makeup,A balm.,1,0,1,shea,USD",
    "Balm,skincare,A balm.,1,0,1.5,shea,USD",
    "Balm,skincare,A balm.,1,0,1,,USD",
    "Balm,skincare,A balm.,1,0,1,shea,CAD",
  ])("rejects bad columns or domain values", (row) => {
    expect(importCsv(csv("IMPORT-1," + row), []).errors.length).toBeGreaterThan(
      0,
    );
  });
  it("requires exact unique headers, permits reordering, and rejects empty files", () => {
    expect(importCsv("", []).errors.length).toBe(1);
    expect(importCsv(CSV_HEADERS.join(","), []).errors[0].message).toContain(
      "no product rows",
    );
    const rows = readCsv(csv(valid));
    expect(
      importCsv(rows.map((r) => r.reverse().join(",")).join("\n"), []).errors,
    ).toEqual([]);
    expect(
      importCsv(csv(valid).replace("currency", "id"), []).errors.length,
    ).toBe(1);
  });
  it.each(['a,"unclosed', 'a,b"c', 'a,"b"c'])(
    "rejects malformed CSV %s",
    (text) => {
      expect(() => readCsv(text)).toThrow();
    },
  );
  it("enforces file size and cumulative product limits", () => {
    expect(importCsv("a".repeat(1_000_001), []).errors[0].message).toContain(
      "1 MB",
    );
    expect(importCsv(csv(valid), [], 500).errors[0].message).toContain("500");
  });
});
