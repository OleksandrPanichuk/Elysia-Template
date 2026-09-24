export interface Names {
  kebab: string;
  snake: string;
  camel: string;
  pascal: string;
  constant: string;
}

const capitalize = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

const wordsOf = (input: string): string[] =>
  input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.toLowerCase());

export const namesOf = (input: string): Names => {
  const words = wordsOf(input);
  const [first, ...rest] = words;

  if (first === undefined) {
    throw new Error(`"${input}" has no letters or digits to build a name from`);
  }

  if (!/^[a-z]/.test(first)) {
    throw new Error(`"${input}" must start with a letter`);
  }

  return {
    kebab: words.join("-"),
    snake: words.join("_"),
    camel: first + rest.map(capitalize).join(""),
    pascal: words.map(capitalize).join(""),
    constant: words.join("_").toUpperCase(),
  };
};

export const singularize = (word: string): string => {
  if (word.endsWith("ies")) return word.replace(/ies$/, "y");
  if (/(ss|x|ch|sh)es$/.test(word)) return word.replace(/es$/, "");
  if (/[^s]s$/.test(word)) return word.slice(0, -1);

  return word;
};

export const singularOf = (plural: Names): Names => {
  const words = plural.kebab.split("-");
  const last = words.pop() ?? "";

  return namesOf([...words, singularize(last)].join("-"));
};
