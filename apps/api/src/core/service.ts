import { Injectable } from "./injectable";

export abstract class Service extends Injectable {
  declare private readonly kind: "service";
}
