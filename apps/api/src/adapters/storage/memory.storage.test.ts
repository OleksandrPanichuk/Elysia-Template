import { beforeEach, describe, expect, test } from "bun:test";

import { MemoryStorage } from "./memory.storage";

describe("MemoryStorage", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  test("round-trips a body and the content type it was given", async () => {
    await storage.put("a/b.png", new Uint8Array([1, 2, 3]), {
      contentType: "image/png",
    });

    const blob = await storage.get("a/b.png");

    expect(blob!.type).toBe("image/png");
    expect(blob!.size).toBe(3);
  });

  test("normalises a text type the way the s3 adapter stores it", async () => {
    await storage.put("a/b.txt", "hello", { contentType: "text/plain" });

    const blob = await storage.get("a/b.txt");

    expect(await blob!.text()).toBe("hello");
    expect(blob!.type).toBe("text/plain;charset=utf-8");
  });

  test("falls back to a binary content type", async () => {
    await storage.put("raw", new Uint8Array([1, 2, 3]));

    expect((await storage.get("raw"))!.type).toBe("application/octet-stream");
  });

  test("reports a miss for a key that was never written", async () => {
    expect(await storage.get("nope")).toBeNull();
    expect(await storage.stat("nope")).toBeNull();
    expect(await storage.exists("nope")).toBe(false);
  });

  test("stats a stored object", async () => {
    await storage.put("a", "12345", { contentType: "text/plain" });

    const stat = await storage.stat("a");

    expect(stat).toMatchObject({
      size: 5,
      contentType: "text/plain;charset=utf-8",
    });
    expect(stat!.lastModified).toBeInstanceOf(Date);
  });

  test("deletes the keys it was given and ignores the rest", async () => {
    await storage.put("a", "1");
    await storage.put("b", "2");

    await storage.delete("a", "missing");

    expect(await storage.exists("a")).toBe(false);
    expect(await storage.exists("b")).toBe(true);
  });

  test("signs a url that carries the method and an expiry", async () => {
    const url = new URL(
      await storage.signedUrl("a/b c.txt", {
        method: "put",
        expiresInSeconds: 60,
      }),
    );

    expect(url.pathname).toBe("/a/b%20c.txt");
    expect(url.searchParams.get("method")).toBe("put");
    expect(Number(url.searchParams.get("expires"))).toBeGreaterThan(
      Math.floor(Date.now() / 1000),
    );
  });

  test("forgets everything when closed", async () => {
    await storage.put("a", "1");
    await storage.close();

    expect(await storage.exists("a")).toBe(false);
  });
});
