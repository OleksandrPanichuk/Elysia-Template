import type { Elysia } from "elysia";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyElysia = Elysia<any, any, any, any, any, any, any>;

export interface AppModule {
  readonly name: string;

  readonly register?: () => void;

  readonly routes?: () => AnyElysia;

  readonly start?: () => Promise<void>;

  readonly shutdown?: () => Promise<void> | void;
}

export const defineModule = <const T extends AppModule>(module: T): T => module;
