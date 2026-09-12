import type { Elysia } from "elysia";

import { type Env, getEnv } from "@/configs";
import { registerReadinessCheck } from "@/core/readiness";
import { type AppLogger, getLogger } from "@/infrastructure";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElysia = Elysia<any, any, any, any, any, any, any>;

type MaybePromise<T> = T | Promise<T>;

export interface ModuleContext {
  readonly name: string;
  readonly env: Env;
  readonly logger: AppLogger;
}

export interface ModuleLifecycleContext<State> extends ModuleContext {
  readonly state: State;
}

export interface ModuleDefinition<State = void> {
  readonly name: string;

  readonly register?: (ctx: ModuleContext) => State;

  readonly routes?: () => AnyElysia;

  readonly start?: (ctx: ModuleLifecycleContext<State>) => MaybePromise<void>;

  readonly ready?: (
    ctx: ModuleLifecycleContext<State>,
  ) => MaybePromise<boolean>;

  readonly shutdown?: (
    ctx: ModuleLifecycleContext<State>,
  ) => MaybePromise<void>;
}

export interface AppModule {
  readonly name: string;
  readonly routes?: () => AnyElysia;
  register(): void;
  start(): Promise<void>;
  shutdown(): Promise<void>;
}

type SyncRegister<State> = [Extract<State, PromiseLike<unknown>>] extends [
  never,
]
  ? unknown
  : {
      readonly register: "register() must be synchronous; move async work into start()";
    };

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { then?: unknown }).then === "function";

export const defineModule = <State = void>(
  def: ModuleDefinition<State> & SyncRegister<State>,
): AppModule => {
  let lifecycle: ModuleLifecycleContext<State> | undefined;
  let unregisterReadiness: (() => void) | undefined;

  const current = (): ModuleLifecycleContext<State> => {
    if (!lifecycle) {
      throw new Error(`Module "${def.name}" has not been registered`);
    }

    return lifecycle;
  };

  return {
    name: def.name,
    routes: def.routes,

    register() {
      const context: ModuleContext = {
        name: def.name,
        env: getEnv(),
        logger: getLogger().child({ module: def.name }),
      };

      const state = def.register?.(context) as State;

      if (isPromiseLike(state)) {
        throw new TypeError(
          `Module "${def.name}": register() must be synchronous; move async work into start()`,
        );
      }

      lifecycle = { ...context, state };

      unregisterReadiness?.();
      unregisterReadiness = undefined;

      const ready = def.ready;

      if (ready) {
        unregisterReadiness = registerReadinessCheck(def.name, () =>
          ready(current()),
        );
      }
    },

    async start() {
      await def.start?.(current());
    },

    async shutdown() {
      if (!lifecycle) return;

      unregisterReadiness?.();
      unregisterReadiness = undefined;

      try {
        await def.shutdown?.(lifecycle);
      } finally {
        lifecycle = undefined;
      }
    },
  };
};
