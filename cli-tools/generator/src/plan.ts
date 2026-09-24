export interface FileCreate {
  kind: "create";
  path: string;
  content: string;
}

export interface FileEdit {
  kind: "edit";
  path: string;
  describe: string;
  apply: (current: string) => string;
}

export type Change = FileCreate | FileEdit;

export interface Plan {
  changes: Change[];
  migration?: string;
  notes: string[];
}

export const create = (path: string, content: string): FileCreate => ({
  kind: "create",
  path,
  content,
});

export const edit = (
  path: string,
  describe: string,
  apply: (current: string) => string,
): FileEdit => ({ kind: "edit", path, describe, apply });
