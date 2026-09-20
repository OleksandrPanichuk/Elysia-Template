import {
  type FileBody,
  type FileStat,
  FileStorage,
  type PutFileOptions,
  type SignedUrlOptions,
} from "@/platform/storage/ports/file-storage";

const MEMORY_ORIGIN = "https://storage.memory";

interface Entry {
  blob: Blob;
  lastModified: Date;
}

const toBlob = (body: FileBody, contentType?: string): Blob => {
  const type = contentType ?? "application/octet-stream";

  if (body instanceof Blob) {
    return contentType ? new Blob([body], { type }) : body;
  }

  return new Blob([body], { type });
};

export class MemoryStorage extends FileStorage {
  private readonly entries = new Map<string, Entry>();

  public put(
    key: string,
    body: FileBody,
    options?: PutFileOptions,
  ): Promise<void> {
    this.entries.set(key, {
      blob: toBlob(body, options?.contentType),
      lastModified: new Date(),
    });

    return Promise.resolve();
  }

  public get(key: string): Promise<Blob | null> {
    return Promise.resolve(this.entries.get(key)?.blob ?? null);
  }

  public stat(key: string): Promise<FileStat | null> {
    const entry = this.entries.get(key);

    if (!entry) return Promise.resolve(null);

    return Promise.resolve({
      size: entry.blob.size,
      contentType: entry.blob.type,
      lastModified: entry.lastModified,
    });
  }

  public exists(key: string): Promise<boolean> {
    return Promise.resolve(this.entries.has(key));
  }

  public delete(...keys: string[]): Promise<void> {
    for (const key of keys) {
      this.entries.delete(key);
    }

    return Promise.resolve();
  }

  public signedUrl(
    key: string,
    { method = "get", expiresInSeconds }: SignedUrlOptions,
  ): Promise<string> {
    const url = new URL(
      key.split("/").map(encodeURIComponent).join("/"),
      `${MEMORY_ORIGIN}/`,
    );

    url.searchParams.set("method", method);
    url.searchParams.set(
      "expires",
      String(Math.floor(Date.now() / 1000) + expiresInSeconds),
    );

    return Promise.resolve(url.toString());
  }

  public close(): Promise<void> {
    this.entries.clear();

    return Promise.resolve();
  }
}
