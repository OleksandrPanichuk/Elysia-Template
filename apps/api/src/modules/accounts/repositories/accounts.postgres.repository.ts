import { and, eq } from "drizzle-orm";

import { accountsSchema, type AccountType } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { UserEntity } from "@/modules/users/user.entity";

import type { AccountEntity } from "../account.entity";
import {
  AccountsRepository,
  type CreateCredentialsAccountData,
  type CreateOAuthAccountData,
} from "../accounts.repository";

export class PostgresAccountsRepository extends AccountsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insertCredentials(
    data: CreateCredentialsAccountData,
  ): Promise<AccountEntity> {
    const [account] = await this.db
      .insert(accountsSchema)
      .values({
        userId: data.userId,
        type: "CREDENTIALS",
        providerAccountId: UserEntity.normalizeEmail(data.email),
        passwordHash: data.passwordHash,
      })
      .returning();

    return account!;
  }

  public async findCredentialsByEmail(
    email: string,
  ): Promise<AccountEntity | null> {
    const [account] = await this.db
      .select()
      .from(accountsSchema)
      .where(
        and(
          eq(accountsSchema.type, "CREDENTIALS"),
          eq(
            accountsSchema.providerAccountId,
            UserEntity.normalizeEmail(email),
          ),
        ),
      )
      .limit(1);

    return account ?? null;
  }

  public async updateCredentialsPasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.db
      .update(accountsSchema)
      .set({ passwordHash })
      .where(
        and(
          eq(accountsSchema.userId, userId),
          eq(accountsSchema.type, "CREDENTIALS"),
        ),
      );
  }

  public async insertOAuthAccount(
    data: CreateOAuthAccountData,
  ): Promise<AccountEntity> {
    const [account] = await this.db
      .insert(accountsSchema)
      .values({
        userId: data.userId,
        type: data.type,
        providerAccountId: data.providerAccountId,
        providerEmail: UserEntity.normalizeEmail(data.providerEmail),
        linkedAt: new Date(),
      })
      .returning();

    return account!;
  }

  public async findByProviderAccountId(
    type: AccountType,
    providerAccountId: string,
  ): Promise<AccountEntity | null> {
    const [account] = await this.db
      .select()
      .from(accountsSchema)
      .where(
        and(
          eq(accountsSchema.type, type),
          eq(accountsSchema.providerAccountId, providerAccountId),
        ),
      )
      .limit(1);
    return account ?? null;
  }

  public async findByUserIdAndType(
    userId: string,
    type: AccountType,
  ): Promise<AccountEntity | null> {
    const [account] = await this.db
      .select()
      .from(accountsSchema)
      .where(
        and(eq(accountsSchema.userId, userId), eq(accountsSchema.type, type)),
      )
      .limit(1);

    return account ?? null;
  }

  public async listByUserId(userId: string): Promise<AccountEntity[]> {
    return this.db
      .select()
      .from(accountsSchema)
      .where(eq(accountsSchema.userId, userId));
  }

  public async deleteByUserIdAndType(
    userId: string,
    type: AccountType,
  ): Promise<void> {
    await this.db
      .delete(accountsSchema)
      .where(
        and(eq(accountsSchema.userId, userId), eq(accountsSchema.type, type)),
      );
  }
}
