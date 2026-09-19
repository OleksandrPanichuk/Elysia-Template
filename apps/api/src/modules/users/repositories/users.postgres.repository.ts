import { eq } from "drizzle-orm";

import { usersSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import { UserEntity } from "../user.entity";
import { UserNotFoundError } from "../users.errors";
import type { CreateUserData, UpdateUserData } from "../users.repository";
import { UsersRepository } from "../users.repository";

export class PostgresUsersRepository extends UsersRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(data: CreateUserData): Promise<UserEntity> {
    const [user] = await this.db
      .insert(usersSchema)
      .values({
        name: data.name,
        email: UserEntity.normalizeEmail(data.email),
      })
      .returning();

    return user!;
  }

  public async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    const [user] = await this.db
      .update(usersSchema)
      .set(data)
      .where(eq(usersSchema.id, id))
      .returning();

    if (!user) {
      throw new UserNotFoundError(`User ${id} not found`);
    }

    return user;
  }

  public list(): Promise<UserEntity[]> {
    return this.db.select().from(usersSchema).orderBy(usersSchema.createdAt);
  }

  public async findById(id: string): Promise<UserEntity | null> {
    const [user] = await this.db
      .select()
      .from(usersSchema)
      .where(eq(usersSchema.id, id))
      .limit(1);

    return user ?? null;
  }

  public async getById(id: string): Promise<UserEntity> {
    const user = await this.findById(id);

    if (!user) {
      throw new UserNotFoundError(`User ${id} not found`);
    }

    return user;
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const [user] = await this.db
      .select()
      .from(usersSchema)
      .where(eq(usersSchema.email, UserEntity.normalizeEmail(email)))
      .limit(1);

    return user ?? null;
  }

  public async markEmailVerified(id: string, verifiedAt: Date): Promise<void> {
    await this.db
      .update(usersSchema)
      .set({ emailVerifiedAt: verifiedAt })
      .where(eq(usersSchema.id, id));
  }

  public async updateEmail(
    id: string,
    email: string,
    verifiedAt: Date,
  ): Promise<void> {
    await this.db
      .update(usersSchema)
      .set({
        email: UserEntity.normalizeEmail(email),
        emailVerifiedAt: verifiedAt,
      })
      .where(eq(usersSchema.id, id));
  }

  public async deleteById(id: string): Promise<void> {
    await this.db.delete(usersSchema).where(eq(usersSchema.id, id));
  }
}
