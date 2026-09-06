import type { AppModule } from "@/core/module";

import { healthModule } from "./health";
import { usersModule } from "./users";

export const modules: readonly AppModule[] = [healthModule, usersModule];
