import type { ApiClient, ApiClientOptions } from "./client";
import { createApiClient } from "./client";

export interface ServerApiClientOptions extends Omit<
  ApiClientOptions,
  "headers"
> {
  cookie?: string;
}

export const createServerApiClient = ({
  cookie,
  ...options
}: ServerApiClientOptions): ApiClient =>
  createApiClient({
    ...options,
    headers: () => (cookie ? { cookie } : undefined),
  });
