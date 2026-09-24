import { describe, expect, test } from "bun:test";

import { namesOf, singularize, singularOf } from "./names";

describe("namesOf", () => {
  test.each([
    [
      "line-items",
      "line-items",
      "line_items",
      "lineItems",
      "LineItems",
      "LINE_ITEMS",
    ],
    [
      "LineItems",
      "line-items",
      "line_items",
      "lineItems",
      "LineItems",
      "LINE_ITEMS",
    ],
    [
      "line_items",
      "line-items",
      "line_items",
      "lineItems",
      "LineItems",
      "LINE_ITEMS",
    ],
    ["invoices", "invoices", "invoices", "invoices", "Invoices", "INVOICES"],
  ])("spells %p every way", (input, kebab, snake, camel, pascal, constant) => {
    expect(namesOf(input)).toEqual({ kebab, snake, camel, pascal, constant });
  });

  test("refuses a name with nothing to build from or a leading digit", () => {
    expect(() => namesOf("--")).toThrow(/no letters or digits/);
    expect(() => namesOf("2fa")).toThrow(/must start with a letter/);
  });
});

describe("singularize", () => {
  test.each([
    ["invoices", "invoice"],
    ["categories", "category"],
    ["boxes", "box"],
    ["addresses", "address"],
    ["matches", "match"],
    ["news", "new"],
    ["status", "statu"],
    ["data", "data"],
  ])("turns %p into %p", (plural, singular) => {
    expect(singularize(plural)).toBe(singular);
  });

  test("singularizes only the last word", () => {
    expect(singularOf(namesOf("line-items")).kebab).toBe("line-item");
    expect(singularOf(namesOf("user-categories")).pascal).toBe("UserCategory");
  });
});
