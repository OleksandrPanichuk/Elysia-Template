export interface ParsedArgs {
  command: string | undefined;
  positionals: string[];
  flags: Readonly<Record<string, string | true>>;
}

export const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const positionals: string[] = [];
  const flags: Record<string, string | true> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? "";

    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const [key = "", inline] = arg.slice(2).split("=", 2);
    const next = argv[index + 1];

    if (inline !== undefined) {
      flags[key] = inline;
    } else if (
      next !== undefined &&
      !next.startsWith("--") &&
      VALUE_FLAGS.has(key)
    ) {
      flags[key] = next;
      index += 1;
    } else {
      flags[key] = true;
    }
  }

  const [command, ...rest] = positionals;

  return { command, positionals: rest, flags };
};

const VALUE_FLAGS = new Set(["db", "singular"]);

export const stringFlag = (
  args: ParsedArgs,
  name: string,
): string | undefined => {
  const value = args.flags[name];

  return typeof value === "string" ? value : undefined;
};

export const booleanFlag = (args: ParsedArgs, name: string): boolean =>
  args.flags[name] === true;
