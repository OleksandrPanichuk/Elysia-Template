import type { Elysia } from "elysia";

import type { modules } from "@/modules";

type ModuleRouteApp<Module> = Module extends { routes?: () => infer App }
  ? App extends undefined
    ? never
    : App
  : never;

type ModuleRoutes<Module> =
  ModuleRouteApp<Module> extends { "~Routes": infer Routes } ? Routes : never;

type UnionToIntersection<Union> = (
  Union extends unknown ? (value: Union) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;

export type AppRoutes = UnionToIntersection<
  ModuleRoutes<(typeof modules)[number]>
>;

export type RoutedApp = Elysia<
  "/api",
  never,
  never,
  never,
  { api: AppRoutes },
  never,
  never
>;
