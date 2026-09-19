import { createGuest, createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

interface UserModel {
  name: string;
}

describe("updating the profile", () => {
  test("renames the caller and shows the new name at once", async () => {
    const user = await createUser({ name: "Old Name" });

    const response = await user.patch<UserModel>("/api/users/me", {
      name: "  New Name  ",
    });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("New Name");

    const me = await user.get<UserModel>("/api/users/me");
    expect(me.body.name).toBe("New Name");
  });

  test("refuses a blank name", async () => {
    const user = await createUser();

    const response = await user.patch<{ code: string }>("/api/users/me", {
      name: "   ",
    });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION");
  });

  test("cannot be reached without signing in", async () => {
    const response = await createGuest().patch("/api/users/me", {
      name: "Nobody",
    });

    expect(response.status).toBe(401);
  });
});
