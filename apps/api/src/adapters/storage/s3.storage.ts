import type { S3Connection } from "@/infrastructure/s3";
import {
  type FileBody,
  type FileStat,
  FileStorage,
  type PutFileOptions,
  type SignedUrlOptions,
} from "@/platform/storage/ports/file-storage";
import { FileStorageUnavailableError } from "@/platform/storage/storage.errors";

const NOT_FOUND_CODES = new Set(["NoSuchKey", "NotFound"]);

const isMissing = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  NOT_FOUND_CODES.has(String((error as { code?: unknown }).code));

export class S3Storage extends FileStorage {
  constructor(private readonly connection: S3Connection) {
    super();
  }

  public async put(
    key: string,
    body: FileBody,
    options?: PutFileOptions,
  ): Promise<void> {
    try {
      await this.connection.instance.write(key, body, {
        ...(options?.contentType ? { type: options.contentType } : {}),
      });
    } catch (error) {
      throw new FileStorageUnavailableError(error);
    }
  }

  public async get(key: string): Promise<Blob | null> {
    const file = this.connection.instance.file(key);

    try {
      const [buffer, stat] = await Promise.all([
        file.arrayBuffer(),
        file.stat(),
      ]);

      return new Blob([buffer], { type: stat.type });
    } catch (error) {
      if (isMissing(error)) return null;

      throw new FileStorageUnavailableError(error);
    }
  }

  public async stat(key: string): Promise<FileStat | null> {
    try {
      const stat = await this.connection.instance.file(key).stat();

      return {
        size: stat.size,
        contentType: stat.type,
        lastModified: stat.lastModified,
      };
    } catch (error) {
      if (isMissing(error)) return null;

      throw new FileStorageUnavailableError(error);
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      return await this.connection.instance.file(key).exists();
    } catch (error) {
      if (isMissing(error)) return false;

      throw new FileStorageUnavailableError(error);
    }
  }

  public async delete(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await Promise.all(
        keys.map((key) => this.connection.instance.delete(key)),
      );
    } catch (error) {
      throw new FileStorageUnavailableError(error);
    }
  }

  public signedUrl(
    key: string,
    { method = "get", expiresInSeconds, contentType }: SignedUrlOptions,
  ): Promise<string> {
    try {
      return Promise.resolve(
        this.connection.instance.presign(key, {
          expiresIn: expiresInSeconds,
          method: method === "put" ? "PUT" : "GET",
          ...(contentType ? { type: contentType } : {}),
        }),
      );
    } catch (error) {
      throw new FileStorageUnavailableError(error);
    }
  }

  public async verify(): Promise<void> {
    if (!(await this.connection.ping())) {
      throw new Error(`S3 bucket "${this.connection.bucket}" is unreachable`);
    }
  }
}
