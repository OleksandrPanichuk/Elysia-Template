import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { AccountType } from "@/db";
import { transaction } from "@/db/executor";
import { AccountsRepository } from "@/modules/accounts";
import { type CreatedSession, SessionsService } from "@/modules/sessions";
import { UserEntity, UsersRepository, UsersService } from "@/modules/users";

import type { OAuthProviderName } from "../oauth.constants";
import { AccountLinkRequiredError } from "../oauth.errors";
import { buildCallbackUrl } from "../oauth.redirect";
import { getOAuthProvider } from "../oauth.registry";
import type { OAuthIdentity } from "../ports/oauth-provider";

export interface CompleteOAuthFlowUseCaseOptions {
  provider: OAuthProviderName;
  code: string;
  codeVerifier: string;
  nonce: string;
}

type Options = CompleteOAuthFlowUseCaseOptions;
type Result = CreatedSession;

export class CompleteOAuthFlowUseCase extends UseCase<Options, Result> {
  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly usersService = makeService(UsersService);

  private readonly sessionsService = makeService(SessionsService);

  private readonly runInTransaction = transaction;

  public async execute({
    provider,
    code,
    codeVerifier,
    nonce,
  }: Options): Promise<Result> {
    const oauthProvider = getOAuthProvider(provider);

    const identity = await oauthProvider.exchange({
      code,
      codeVerifier,
      nonce,
      redirectUri: buildCallbackUrl(provider),
    });

    const userId = await this.resolveUserId(
      oauthProvider.accountType,
      identity,
    );

    await this.sessionsService.revokeAllForUser(userId);

    return this.sessionsService.create(userId);
  }

  private async resolveUserId(
    accountType: AccountType,
    identity: OAuthIdentity,
  ): Promise<string> {
    const linked = await this.accountsRepository.findByProviderAccountId(
      accountType,
      identity.providerAccountId,
    );

    if (linked) return linked.userId;

    const email = UserEntity.normalizeEmail(identity.email);
    const existing = await this.usersRepository.findByEmail(email);

    if (existing) {
      if (!identity.emailIsAuthoritative) {
        throw new AccountLinkRequiredError(
          "An account with this email already exists. Sign in and link this provider from your settings.",
        );
      }

      await this.accountsRepository.insertOAuthAccount({
        userId: existing.id,
        type: accountType,
        providerAccountId: identity.providerAccountId,
        providerEmail: email,
      });

      return existing.id;
    }

    return this.runInTransaction(async () => {
      const user = await this.usersService.create({
        name: identity.name ?? email,
        email,
      });

      await this.accountsRepository.insertOAuthAccount({
        userId: user.id,
        type: accountType,
        providerAccountId: identity.providerAccountId,
        providerEmail: email,
      });

      if (identity.emailIsAuthoritative) {
        await this.usersService.markEmailVerified(user.id, new Date());
      }

      return user.id;
    });
  }
}
