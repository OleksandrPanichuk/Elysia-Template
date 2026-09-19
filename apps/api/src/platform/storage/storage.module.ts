import { MemoryStorage } from "@/adapters/storage/memory.storage";
import { S3Storage } from "@/adapters/storage/s3.storage";
import { NodeEnv } from "@/configs";
import { defineModule } from "@/core/module";
import { bind } from "@/core/registry";
import { S3Connection } from "@/infrastructure/s3";

import { FileStorage } from "./ports";

export const storageModule = defineModule({
  name: "storage",

  register: ({ env }) => {
    if (env.NODE_ENV === NodeEnv.Test) {
      const storage = new MemoryStorage();

      bind(FileStorage, () => storage);

      return { storage, connection: undefined };
    }

    const bucket = env.STORAGE_S3_BUCKET;
    const accessKeyId = env.STORAGE_S3_ACCESS_KEY_ID;
    const secretAccessKey = env.STORAGE_S3_SECRET_ACCESS_KEY;

    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "STORAGE_S3_BUCKET, STORAGE_S3_ACCESS_KEY_ID and STORAGE_S3_SECRET_ACCESS_KEY are required outside NODE_ENV=test",
      );
    }

    const connection = new S3Connection({
      name: "storage",
      bucket,
      region: env.STORAGE_S3_REGION,
      accessKeyId,
      secretAccessKey,
      endpoint: env.STORAGE_S3_ENDPOINT,
      forcePathStyle: env.STORAGE_S3_FORCE_PATH_STYLE,
    });
    const storage = new S3Storage(connection);

    bind(FileStorage, () => storage);

    return { storage, connection };
  },

  start: ({ state }) => state.storage.verify(),

  ready: ({ state }) => state.connection?.ping() ?? true,

  shutdown: ({ state }) => state.storage.close(),
});
