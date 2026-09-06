import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const enterRequestContext = (context: RequestContext): void => {
  storage.enterWith(context);
};

export const getRequestContext = (): RequestContext | undefined =>
  storage.getStore();

export const runWithRequestContext = <T>(
  context: RequestContext,
  callback: () => T,
): T => storage.run(context, callback);
