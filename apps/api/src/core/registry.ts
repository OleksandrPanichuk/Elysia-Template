type Instantiable<T> = new () => T;

export type Token<T> = Instantiable<T> | (abstract new (...args: never[]) => T);

const factories = new Map<Token<unknown>, () => unknown>();
const instances = new Map<Token<unknown>, unknown>();
const resolving = new Set<Token<unknown>>();

const nameOf = (token: Token<unknown>) => token.name || "anonymous";

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

export const makeService = make;
export const makeRepository = make;
export const makeUseCase = make;
