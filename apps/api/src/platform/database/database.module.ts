import { defineModule } from "@/core/module";
import { pingDatabase } from "@/db";

export const databaseModule = defineModule({
  name: "database",

  start: () => pingDatabase(),

  ready: () =>
    pingDatabase().then(
      () => true,
      () => false,
    ),
});
