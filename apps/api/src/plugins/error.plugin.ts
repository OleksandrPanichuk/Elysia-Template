import { Elysia } from "elysia";

import type { AuthUser } from "@/core/auth";
import { AppError } from "@/core/errors";
import { HttpStatus } from "@/core/http";
import { make } from "@/core/registry";
import { getLogger } from "@/infrastructure";
import { ErrorReporter } from "@/platform/error-reporting";
import { getRequestContext } from "@/shared";

const INTERNAL_ERROR_MESSAGE = "Something went wrong";

export const errorPlugin = new Elysia({ name: "errors" })
  .onError((context) => {
    const { code, error, set, request } = context;

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

    if (code === "PARSE") {
      set.status = HttpStatus.BadRequest;
      return { code: "BAD_REQUEST", error: "Malformed request body" };
    }

    if (error instanceof AppError) {
      set.status = error.status;
      return { code: error.code, error: error.message, details: error.details };
    }

    if (code === "NOT_FOUND") {
      set.status = HttpStatus.NotFound;
      return { code: "NOT_FOUND", error: "Not found" };
    }

    const requestId = getRequestContext()?.requestId;

    const method = request.method;
    const path = new URL(request.url).pathname;
    const userId = (context as { user?: AuthUser }).user?.id;

    getLogger().error(
      { method, path, code, requestId, err: error },
      "unhandled error",
    );

    make(ErrorReporter).report(error, {
      source: "http",
      requestId,
      userId,
      tags: { method, path },
    });

    set.status = HttpStatus.InternalServerError;
    return {
      code: "INTERNAL",
      error: INTERNAL_ERROR_MESSAGE,
      ...(requestId ? { requestId } : {}),
    };
  })
  .as("global");
