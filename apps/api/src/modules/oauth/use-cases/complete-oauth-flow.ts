import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import type { AccountType } from "@/db";
import { transaction } from "@/db/executor";
import { AccountsRepository } from "@/modules/accounts";
import { AuthService } from "@/modules/auth";
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

  userAgent?: string | null;
  ip?: string | null;
}

type Options = CompleteOAuthFlowUseCaseOptions;
type Result = CreatedSession;

export class CompleteOAuthFlowUseCase extends UseCase<Options, Result> {
  private readonly accountsRepository = makeRepository(AccountsRepository);

  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly usersService = makeService(UsersService);

  private readonly sessionsService = makeService(SessionsService);

  private readonly authService = makeService(AuthService);

  private readonly runInTransaction = transaction;

  public async execute({
    provider,
    code,
    codeVerifier,
    nonce,
    userAgent,
    ip,
  }: Options): Promise<Result> {
    const oauthProvider = getOAuthProvider(provider);

    const identity = await oauthProvider.exchange({
      code,
      codeVerifier,
      nonce,
      redirectUri: buildCallbackUrl(provider),
    });

    const { userId, provisioned } = await this.resolveUserId(
      oauthProvider.accountType,
      identity,
    );

    const created = await this.sessionsService.create(userId, {
      userAgent,
      ip,
    });

    if (created.newDevice && !provisioned) {
      const user = await this.usersRepository.getById(userId);

      await this.authService.notifyNewSignIn(user, {
        userAgent: userAgent ?? null,
        ip: ip ?? null,
      });
    }

    return created;
  }

  private async resolveUserId(
    accountType: AccountType,
    identity: OAuthIdentity,
  ): Promise<{ userId: string; provisioned: boolean }> {
    const linked = await this.accountsRepository.findByProviderAccountId(
      accountType,
      identity.providerAccountId,
    );

    if (linked) return { userId: linked.userId, provisioned: false };

    const email = UserEntity.normalizeEmail(identity.email);
    const existing = await this.usersRepository.findByEmail(email);

    if (existing) {
      const canAutoLink =
        identity.emailIsAuthoritative && UserEntity.isEmailVerified(existing);

      if (!canAutoLink) {
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

      return { userId: existing.id, provisioned: false };
    }

    const userId = await this.runInTransaction(async () => {
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

    return { userId, provisioned: true };
  }
}
