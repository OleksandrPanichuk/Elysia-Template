import {
  completeOAuth,
  createOAuthUser,
  createUser,
  useOAuthIdentity,
} from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import { OAuthProviderName } from "@/modules/oauth";

interface ConnectedAccount {
  type: string;
  canDisconnect: boolean;
}

const { Google } = OAuthProviderName;

describe("connected accounts", () => {
  test("never offers to disconnect the password", async () => {
    const user = await createUser();

    useOAuthIdentity(Google);
    await completeOAuth(user, Google, {
      path: `/api/auth/oauth/${Google}/link`,
      method: "POST",
    });

    const response = await user.get<ConnectedAccount[]>("/api/auth/accounts");
    const byType = Object.fromEntries(
      response.body.map((account) => [account.type, account.canDisconnect]),
    );

    expect(byType).toEqual({ CREDENTIALS: false, GOOGLE: true });
  });

  test("keeps the only provider when it is the only way in", async () => {
    const user = await createOAuthUser(Google);

    const response = await user.get<ConnectedAccount[]>("/api/auth/accounts");

    expect(response.body).toHaveLength(1);
    expect(response.body[0]?.canDisconnect).toBe(false);
  });
});
