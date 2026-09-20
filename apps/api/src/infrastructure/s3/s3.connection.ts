import { S3Client } from "bun";

import { getLogger } from "@/infrastructure/logger";

export interface S3ConnectionOptions {
  name: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export class S3Connection {
  private client: S3Client | undefined;

  constructor(private readonly config: S3ConnectionOptions) {}

  public get name(): string {
    return this.config.name;
  }

  public get bucket(): string {
    return this.config.bucket;
  }

  public get instance(): S3Client {
    if (this.client) return this.client;

    const { endpoint, forcePathStyle } = this.config;

    this.client = new S3Client({
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      bucket: this.config.bucket,
      region: this.config.region,
      ...(endpoint ? { endpoint } : {}),
      virtualHostedStyle: !(forcePathStyle ?? Boolean(endpoint)),
    });

    return this.client;
  }

  public async ping(): Promise<boolean> {
    try {
      await this.instance.list({ maxKeys: 1 });

      return true;
    } catch (error) {
      getLogger().error(
        { component: "S3Connection", connection: this.config.name, err: error },
        "s3 bucket unreachable",
      );

      return false;
    }
  }
}
