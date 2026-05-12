import { describe, it, expect } from "vitest";
import { csvEscape, csvRow, csvHeader } from "@/lib/csv";

describe("csvEscape", () => {
  it("passes plain text through", () => {
    expect(csvEscape("alice")).toBe("alice");
  });
  it("quotes values with commas", () => {
    expect(csvEscape("a,b")).toBe('"a,b"');
  });
  it("doubles inner quotes", () => {
    expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""');
  });
  it("quotes values with newlines", () => {
    expect(csvEscape("a\nb")).toBe('"a\nb"');
  });
  it("null/undefined become empty", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
  it("booleans format as true/false", () => {
    expect(csvEscape(true)).toBe("true");
    expect(csvEscape(false)).toBe("false");
  });
  it("Date becomes ISO 8601", () => {
    expect(csvEscape(new Date("2026-05-12T13:00:00Z"))).toBe("2026-05-12T13:00:00.000Z");
  });
});

describe("csvRow / csvHeader", () => {
  it("joins escaped values with comma + CRLF", () => {
    expect(csvRow(["a", "b,c", "d"])).toBe('a,"b,c",d\r\n');
  });
  it("csvHeader writes the header row", () => {
    expect(csvHeader(["col1", "col2"])).toBe("col1,col2\r\n");
  });
});
