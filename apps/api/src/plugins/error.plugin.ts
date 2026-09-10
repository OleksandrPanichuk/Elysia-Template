import { Elysia } from "elysia";

import { AppError } from "@/core/errors";
import { HttpStatus } from "@/core/http";
import { getLogger } from "@/infrastructure";

export const errorPlugin = new Elysia({ name: "errors" })
  .onError(({ code, error, set, request }) => {
    if (code === "VALIDATION") {
      set.status = HttpStatus.UnprocessableEntity;
      return {
        code: "VALIDATION",
        error: `Invalid ${error.type}`,
        issues: error.all.map((issue) => ({
          path: "path" in issue ? issue.path : undefined,
          message: issue.summary,
        })),
      };
    }

    if (error instanceof AppError) {
      set.status = error.status;
      return { code: error.code, error: error.message, details: error.details };
    }

    if (code === "NOT_FOUND") {
      set.status = HttpStatus.NotFound;
      return { code: "NOT_FOUND", error: "Not found" };
    }

    getLogger().error(
      {
        method: request.method,
        path: new URL(request.url).pathname,
        code,
        err: error,
      },
      "unhandled error",
    );

    set.status = HttpStatus.InternalServerError;
    return {
      code: "INTERNAL",
      error: error instanceof Error ? error.message : String(error),
    };
  })
  .as("global");
