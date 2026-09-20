export type FileBody = string | ArrayBuffer | Uint8Array | Blob;

export interface PutFileOptions {
  contentType?: string;
}

export interface FileStat {
  size: number;
  contentType: string;
  lastModified: Date;
}

export type SignedUrlMethod = "get" | "put";

export interface SignedUrlOptions {
  method?: SignedUrlMethod;
  expiresInSeconds: number;
  contentType?: string;
}

export abstract class FileStorage {
  public abstract put(
    key: string,
    body: FileBody,
    options?: PutFileOptions,
  ): Promise<void>;

  public abstract get(key: string): Promise<Blob | null>;

  public abstract stat(key: string): Promise<FileStat | null>;

  public abstract exists(key: string): Promise<boolean>;

  public abstract delete(...keys: string[]): Promise<void>;

  public abstract signedUrl(
    key: string,
    options: SignedUrlOptions,
  ): Promise<string>;

  public verify(): Promise<void> {
    return Promise.resolve();
  }

  public close(): Promise<void> {
    return Promise.resolve();
  }
}
