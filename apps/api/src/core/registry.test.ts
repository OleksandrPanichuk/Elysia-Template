import { describe, expect, test } from "bun:test";

import { SessionsService } from "@/modules/sessions";
import { UsersRepository } from "@/modules/users";
import { GetCurrentUserUseCase } from "@/modules/users/use-cases";

import { make, makeRepository, makeService, makeUseCase } from "./registry";

describe("registry aliases", () => {
  test("resolve the same singleton as make", () => {
    expect(makeService(SessionsService)).toBe(make(SessionsService));
    expect(makeRepository(UsersRepository)).toBe(make(UsersRepository));
    expect(makeUseCase(GetCurrentUserUseCase)).toBe(
      make(GetCurrentUserUseCase),
    );
  });

  test("refuse a token of the wrong kind at compile time", () => {
    // @ts-expect-error a service is not a repository
    makeRepository(SessionsService);
    // @ts-expect-error a repository is not a service
    makeService(UsersRepository);
    // @ts-expect-error a use case is not a service
    makeService(GetCurrentUserUseCase);

    expect(true).toBe(true);
  });
});
