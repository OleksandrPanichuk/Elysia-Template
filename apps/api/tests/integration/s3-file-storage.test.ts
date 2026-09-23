import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { S3Storage } from "@/adapters/storage/s3.storage";
import { S3Connection } from "@/infrastructure/s3";
import { FileStorageUnavailableError } from "@/platform/storage";

const endpoint = process.env.TEST_S3_ENDPOINT;
const bucket = process.env.TEST_S3_BUCKET;
const accessKeyId = process.env.TEST_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.TEST_S3_SECRET_ACCESS_KEY;

const configured = Boolean(
  endpoint && bucket && accessKeyId && secretAccessKey,
);

const connection = configured
  ? new S3Connection({
      name: "test-storage",
      bucket: bucket!,
      region: "us-east-1",
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      endpoint,
    })
  : undefined;

const storage = connection ? new S3Storage(connection) : undefined;

const PREFIX = "integration/";

const clear = async (): Promise<void> => {
  if (!connection) return;

  const listed = await connection.instance.list({ prefix: PREFIX });

  for (const object of listed.contents ?? []) {
    await connection.instance.delete(object.key);
  }
};

afterAll(clear);

describe.skipIf(!storage)("S3Storage against a real S3 API", () => {
  beforeEach(clear);

  test("verifies that the bucket is reachable", async () => {
    expect(await storage!.verify().then(() => "ok")).toBe("ok");
  });

  test("round-trips bytes and the content type", async () => {
    await storage!.put(`${PREFIX}a.png`, new Uint8Array([1, 2, 3]), {
      contentType: "image/png",
    });

    const blob = await storage!.get(`${PREFIX}a.png`);

    expect(blob!.type).toBe("image/png");
    expect(blob!.size).toBe(3);
    expect(new Uint8Array(await blob!.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });

  test("reports a miss rather than throwing for an absent key", async () => {
    expect(await storage!.get(`${PREFIX}nope`)).toBeNull();
    expect(await storage!.stat(`${PREFIX}nope`)).toBeNull();
    expect(await storage!.exists(`${PREFIX}nope`)).toBe(false);
  });

  test("stats a stored object", async () => {
    await storage!.put(`${PREFIX}b.txt`, "hello", {
      contentType: "text/plain",
    });

    const stat = await storage!.stat(`${PREFIX}b.txt`);

    expect(stat!.size).toBe(5);
    expect(stat!.contentType).toBe("text/plain;charset=utf-8");
    expect(stat!.lastModified).toBeInstanceOf(Date);
  });

  test("deletes a key and stays quiet about one that is gone", async () => {
    await storage!.put(`${PREFIX}c`, "1");

    await storage!.delete(`${PREFIX}c`, `${PREFIX}never-existed`);

    expect(await storage!.exists(`${PREFIX}c`)).toBe(false);
  });

  test("signs a url a plain http client can read through", async () => {
    await storage!.put(`${PREFIX}d.txt`, "signed", {
      contentType: "text/plain",
    });

    const url = await storage!.signedUrl(`${PREFIX}d.txt`, {
      expiresInSeconds: 60,
    });
    const response = await fetch(url);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("signed");
  });

  test("signs a url a plain http client can write through", async () => {
    const url = await storage!.signedUrl(`${PREFIX}e.txt`, {
      method: "put",
      expiresInSeconds: 60,
    });

    const response = await fetch(url, { method: "PUT", body: "uploaded" });

    expect(response.ok).toBe(true);
    expect(await (await storage!.get(`${PREFIX}e.txt`))!.text()).toBe(
      "uploaded",
    );
  });

  test("fails loudly when the bucket does not exist", async () => {
    const missing = new S3Storage(
      new S3Connection({
        name: "test-storage-missing",
        bucket: `${bucket}-does-not-exist`,
        region: "us-east-1",
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
        endpoint,
      }),
    );

    const failure = await missing.put("x", "1").then(
      () => null,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(FileStorageUnavailableError);
  });
});
