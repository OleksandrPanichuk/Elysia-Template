import type { createApp } from "@/core/app";

type App = ReturnType<typeof createApp>;

let app: App | undefined;

export const setApp = (instance: App): void => {
  app = instance;
};

export const getApp = (): App => {
  if (!app) {
    throw new Error("The app has not booted; is tests/helpers/preload.ts set?");
  }

  return app;
};
