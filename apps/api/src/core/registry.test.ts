import { describe, expect, test } from "bun:test";

import { SessionsService } from "@/modules/sessions";
import { UsersRepository } from "@/modules/users";
import { GetCurrentUserUseCase } from "@/modules/users/use-cases";

import { Port } from "./port";
import {
  bind,
  make,
  makeRepository,
  makeService,
  makeUseCase,
} from "./registry";

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

abstract class ProbePort extends Port {
  public abstract ping(): string;
}

class ProbeAdapter extends ProbePort {
  public ping(): string {
    return "pong";
  }
}

class PlainProbe {
  public readonly id = crypto.randomUUID();
}

describe("ports", () => {
  test("refuse to resolve without a binding instead of building an empty object", () => {
    abstract class UnboundPort extends Port {
      public abstract ping(): string;
    }

    expect(() => make(UnboundPort)).toThrow(
      /"UnboundPort" is a port with no binding/,
    );
  });

  test("resolve to the bound adapter, once", () => {
    const adapter = new ProbeAdapter();

    bind(ProbePort, () => adapter);

    expect(make(ProbePort)).toBe(adapter);
    expect(make(ProbePort).ping()).toBe("pong");
  });

  test("pick up a new binding", () => {
    const first = new ProbeAdapter();
    const second = new ProbeAdapter();

    bind(ProbePort, () => first);
    make(ProbePort);
    bind(ProbePort, () => second);

    expect(make(ProbePort)).toBe(second);
  });

  test("leave plain classes to be built on first use and shared after", () => {
    expect(make(PlainProbe)).toBe(make(PlainProbe));
  });
});
