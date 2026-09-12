import { Redis, type RedisOptions } from "ioredis";

import { getLogger } from "@/infrastructure/logger";

export interface RedisConnectionOptions {
  name: string;
  url?: string;
  options?: RedisOptions;
}

export class RedisConnection {
  private client: Redis | undefined;

  constructor(private readonly config: RedisConnectionOptions) {}

  public get name(): string {
    return this.config.name;
  }

  public get instance(): Redis {
    if (this.client) return this.client;

    const options: RedisOptions = { lazyConnect: true, ...this.config.options };

    const client = this.config.url
      ? new Redis(this.config.url, options)
      : new Redis(options);

    client.on("error", (error: unknown) => {
      getLogger().error(
        {
          component: "RedisConnection",
          connection: this.config.name,
          err: error,
        },
        "redis connection error",
      );
    });

    this.client = client;

    return client;
  }

  public async connect(): Promise<Redis> {
    const client = this.instance;

    if (client.status === "ready") {
      return client;
    }

    if (client.status === "wait" || client.status === "end") {
      await client.connect();

      return client;
    }

    await new Promise<void>((resolve, reject) => {
      client.once("ready", resolve);
      client.once("error", reject);
    });

    return client;
  }

  public async ping(): Promise<boolean> {
    try {
      const client = await this.connect();

      return (await client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    const client = this.client;

    if (!client) return;

    this.client = undefined;

    await client.quit().catch(() => client.disconnect());
  }
}
