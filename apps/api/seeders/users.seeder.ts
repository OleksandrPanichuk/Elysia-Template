import { makeRepository, makeService } from "@/core/registry";
import { transaction } from "@/db/executor";
import { AccountsRepository, AccountsService } from "@/modules/accounts";
import { UserEntity, UsersRepository, UsersService } from "@/modules/users";

import { SEED_PASSWORD } from "./seed.constants";
import type { Seeder, SeedOutcome } from "./seeder";

interface SeedUser {
  label: string;
  name: string;
  email: string;
  password: string | null;
  verified: boolean;
  googleAccountId: string | null;
}

export const SEED_USERS: readonly SeedUser[] = [
  {
    label: "Unverified password user",
    name: "Unverified User",
    email: "unverified@example.test",
    password: SEED_PASSWORD,
    verified: false,
    googleAccountId: null,
  },
  {
    label: "Verified password user",
    name: "Verified User",
    email: "verified@example.test",
    password: SEED_PASSWORD,
    verified: true,
    googleAccountId: null,
  },
  {
    label: "Password user with Google linked",
    name: "Linked User",
    email: "linked@example.test",
    password: SEED_PASSWORD,
    verified: true,
    googleAccountId: "seed-google-linked",
  },
  {
    label: "Google-only user",
    name: "Google User",
    email: "google@example.test",
    password: null,
    verified: true,
    googleAccountId: "seed-google-only",
  },
];

const credentialsOf = (user: SeedUser): Record<string, string> => ({
  email: user.email,
  ...(user.password ? { password: user.password } : {}),
  ...(user.googleAccountId ? { "google-sub": user.googleAccountId } : {}),
});

const seedUser = async (user: SeedUser): Promise<SeedOutcome> => {
  const usersService = makeService(UsersService);
  const usersRepository = makeRepository(UsersRepository);
  const accountsService = makeService(AccountsService);
  const accountsRepository = makeRepository(AccountsRepository);

  const email = UserEntity.normalizeEmail(user.email);
  const outcome = { label: user.label, credentials: credentialsOf(user) };

  if (await usersRepository.findByEmail(email)) {
    return { ...outcome, status: "existing" };
  }

  await transaction(async () => {
    const created = await usersService.create({ name: user.name, email });

    if (user.password) {
      await accountsService.createCredentials({
        userId: created.id,
        email,
        password: user.password,
      });
    }

    if (user.googleAccountId) {
      await accountsRepository.insertOAuthAccount({
        userId: created.id,
        type: "GOOGLE",
        providerAccountId: user.googleAccountId,
        providerEmail: email,
      });
    }

    if (user.verified) {
      await usersService.markEmailVerified(created.id, new Date());
    }
  });

  return { ...outcome, status: "created" };
};

export const usersSeeder: Seeder = {
  name: "users",

  run: async () => {
    const outcomes: SeedOutcome[] = [];

    for (const user of SEED_USERS) {
      outcomes.push(await seedUser(user));
    }

    return outcomes;
  },
};
