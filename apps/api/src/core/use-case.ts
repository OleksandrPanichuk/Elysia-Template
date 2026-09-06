import { Injectable } from "./injectable";

export abstract class UseCase<
  Input = void,
  Output = unknown,
> extends Injectable {
  public abstract execute(input: Input): Promise<Output>;
}

export type Executable<T> = Pick<T, "execute" & keyof T>;
