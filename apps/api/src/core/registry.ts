import { Port } from "./port";
import type { Repository } from "./repository";
import type { Service } from "./service";
import type { UseCase } from "./use-case";

type Instantiable<T> = new () => T;

export type Token<T> = Instantiable<T> | (abstract new (...args: never[]) => T);

const factories = new Map<Token<unknown>, () => unknown>();
const instances = new Map<Token<unknown>, unknown>();
const resolving = new Set<Token<unknown>>();

const nameOf = (token: Token<unknown>) => token.name || "anonymous";

const isPort = (token: Token<unknown>): boolean =>
  token === Port || token.prototype instanceof Port;

export const make = <T>(token: Token<T>): T => {
  if (instances.has(token)) return instances.get(token) as T;

  if (resolving.has(token)) {
    throw new Error(
      `Circular dependency detected while resolving "${nameOf(token)}". ` +
        `Break the cycle by moving the shared work into a use case above both.`,
    );
  }

  resolving.add(token);
  try {
    const factory = factories.get(token);

    if (!factory && isPort(token)) {
      throw new Error(
        `"${nameOf(token)}" is a port with no binding. ` +
          `Bind an adapter to it in its module's register(), ` +
          `and register the module before anything resolves it.`,
      );
    }

    const instance = factory
      ? (factory() as T)
      : new (token as Instantiable<T>)();

    instances.set(token, instance);
    return instance;
  } finally {
    resolving.delete(token);
  }
};

export const bind = <T>(token: Token<T>, factory: () => T): void => {
  factories.set(token, factory);
  instances.delete(token);
};

export const resetRegistry = (): void => {
  factories.clear();
  instances.clear();
  resolving.clear();
};

export const makeService = <T extends Service>(token: Token<T>): T =>
  make(token);

export const makeRepository = <T extends Repository>(token: Token<T>): T =>
  make(token);

export const makeUseCase = <T extends UseCase<never, unknown>>(
  token: Token<T>,
): T => make(token);
