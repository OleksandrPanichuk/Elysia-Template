import { Port } from "./port";

export abstract class Repository extends Port {
  declare private readonly kind: "repository";
}
