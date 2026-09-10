export const PASSWORD_HASH_OPTIONS = {
  algorithm: "argon2id",
  memoryCost: 64 * 1024,
  timeCost: 2,
} as const;

export const UNKNOWN_ACCOUNT_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=2,p=1$aMFhqhdgxNvSKaBpYWKVhCu7rrGItYygqOyy0RWGSRk$2sBAXrG0xCLZtG4zlMGH/a1jnZBaE/yPl9h/JL0wY/Y";
