import type { Context, TSchema } from "elysia";

import type { AuthUser } from "./auth";

type Static<S> = S extends TSchema ? S["static"] : never;

type RawContext = Pick<Context, "request" | "headers" | "cookie" | "set"> & {
  body: unknown;
  params: unknown;
  query: unknown;
};

type RouteContext<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Auth extends boolean = false,
> = {
  body: Static<Body>;
  params: Static<Params>;
  query: Static<Query>;
  request: Context["request"];
  headers: Context["headers"];
  cookie: Context["cookie"];
  set: Context["set"];
} & (Auth extends true ? { user: AuthUser } : object);

type PostActionContext<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Auth extends boolean,
  Out,
> = RouteContext<Body, Params, Query, Auth> & { output: Out };

export type RouteGuard<
  Body extends TSchema | undefined = undefined,
  Params extends TSchema | undefined = undefined,
  Query extends TSchema | undefined = undefined,
  Auth extends boolean = false,
> = (context: RouteContext<Body, Params, Query, Auth>) => unknown;

interface RouteBase<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Response extends TSchema,
  Auth extends boolean,
> {
  response: Response;
  body?: Body;
  params?: Params;
  query?: Query;
  auth?: Auth;
  guards?: Array<RouteGuard<Body, Params, Query, Auth>>;
  summary?: string;
  description?: string;
}

interface RouteDetail {
  summary?: string;
  description?: string;
  security?: Array<{ sessionAuth: string[] }>;
}

type RouteHook<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Response extends TSchema,
  Auth extends boolean,
> = { response: Response; detail: RouteDetail } & (Auth extends true
  ? { auth: true }
  : object) &
  (Body extends TSchema ? { body: Body } : object) &
  (Params extends TSchema ? { params: Params } : object) &
  (Query extends TSchema ? { query: Query } : object);

type RouteTuple<
  Body extends TSchema | undefined,
  Params extends TSchema | undefined,
  Query extends TSchema | undefined,
  Response extends TSchema,
  Auth extends boolean,
> = readonly [
  (context: RawContext) => Promise<Static<Response>>,
  RouteHook<Body, Params, Query, Response, Auth>,
];

export function defineRoute<
  const Body extends TSchema | undefined = undefined,
  const Params extends TSchema | undefined = undefined,
  const Query extends TSchema | undefined = undefined,
  const Response extends TSchema = TSchema,
  const Auth extends boolean = false,
  Out = unknown,
>(
  definition: RouteBase<Body, Params, Query, Response, Auth> & {
    action: (
      context: RouteContext<Body, Params, Query, Auth>,
    ) => Out | Promise<Out>;
    postAction: (
      context: PostActionContext<Body, Params, Query, Auth, Awaited<Out>>,
    ) => Static<Response> | Promise<Static<Response>>;
  },
): RouteTuple<Body, Params, Query, Response, Auth>;

export function defineRoute<
  const Body extends TSchema | undefined = undefined,
  const Params extends TSchema | undefined = undefined,
  const Query extends TSchema | undefined = undefined,
  const Response extends TSchema = TSchema,
  const Auth extends boolean = false,
>(
  definition: RouteBase<Body, Params, Query, Response, Auth> & {
    action: (
      context: RouteContext<Body, Params, Query, Auth>,
    ) => Static<Response> | Promise<Static<Response>>;
    postAction?: undefined;
  },
): RouteTuple<Body, Params, Query, Response, Auth>;

export function defineRoute(
  definition: RouteBase<TSchema, TSchema, TSchema, TSchema, boolean> & {
    action: (context: RouteContext<TSchema, TSchema, TSchema>) => unknown;
    postAction?: (
      context: RouteContext<TSchema, TSchema, TSchema> & { output: never },
    ) => unknown;
  },
): RouteTuple<TSchema, TSchema, TSchema, TSchema, boolean> {
  const {
    response,
    action,
    postAction,
    body,
    params,
    query,
    auth,
    guards,
    summary,
    description,
  } = definition;

  const handler = async (context: RawContext): Promise<Static<TSchema>> => {
    const output = await action(context);

    return postAction
      ? await postAction({ ...context, output: output as never })
      : output;
  };

  const hook = {
    ...(body ? { body } : {}),
    ...(params ? { params } : {}),
    ...(query ? { query } : {}),
    ...(guards?.length ? { beforeHandle: guards } : {}),
    ...(auth ? { auth: true as const } : {}),
    response,
    detail: {
      ...(summary ? { summary } : {}),
      ...(description ? { description } : {}),
      ...(auth ? { security: [{ sessionAuth: [] }] } : {}),
    },
  };

  return [handler, hook] as RouteTuple<
    TSchema,
    TSchema,
    TSchema,
    TSchema,
    boolean
  >;
}
