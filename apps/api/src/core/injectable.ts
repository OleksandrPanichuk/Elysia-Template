import { type Env, getEnv } from "@/configs";
import { type AppLogger, getLogger } from "@/infrastructure";

export abstract class Injectable {
  #logger: AppLogger | undefined;
  #root: AppLogger | undefined;

  protected get env(): Env {
    return getEnv();
  }

  protected get logger(): AppLogger {
    const root = getLogger();
    let child = this.#logger;

    if (!child || this.#root !== root) {
      child = root.child({ component: this.constructor.name });
      this.#logger = child;
      this.#root = root;
    }

    return child;
  }
}
