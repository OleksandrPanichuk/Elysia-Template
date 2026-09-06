import type { UserEntity } from "./users.entity";

export interface CreateUserData {
  name: string;
}

export abstract class UsersRepository {
  public abstract insert(data: CreateUserData): Promise<UserEntity>;
  public abstract list(): Promise<UserEntity[]>;
  public abstract findById(id: string): Promise<UserEntity | null>;
  public abstract getById(id: string): Promise<UserEntity>;
}
