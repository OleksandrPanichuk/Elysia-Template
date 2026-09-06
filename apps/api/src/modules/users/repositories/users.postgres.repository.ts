import { eq } from "drizzle-orm";

import { users } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import type { UserEntity } from "../users.entity";
import { UserNotFoundError } from "../users.errors";
import type { CreateUserData } from "../users.repository";
import { UsersRepository } from "../users.repository";

export class PostgresUsersRepository extends UsersRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(data: CreateUserData): Promise<UserEntity> {
    const [user] = await this.db.insert(users).values(data).returning();

    return user!;
  }

  public list(): Promise<UserEntity[]> {
    return this.db.select().from(users).orderBy(users.createdAt);
  }

  public async findById(id: string): Promise<UserEntity | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ?? null;
  }

  public async getById(id: string): Promise<UserEntity> {
    const user = await this.findById(id);

    if (!user) {
      throw new UserNotFoundError(`UserEntity ${id} not found`);
    }

    return user;
  }
}
