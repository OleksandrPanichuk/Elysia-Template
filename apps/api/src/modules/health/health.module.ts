import { defineModule } from "@/core/module";

import { healthRoutes } from "./health.routes";

export const healthModule = defineModule({
  name: "health",
  routes: () => healthRoutes(),
});
