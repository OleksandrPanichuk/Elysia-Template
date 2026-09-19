import { Repository } from "@/core/repository";

import type { UserEntity } from "./user.entity";

export interface CreateUserData {
  name: string;
  email: string;
}

export abstract class UsersRepository extends Repository {
  public abstract insert(data: CreateUserData): Promise<UserEntity>;
  public abstract list(): Promise<UserEntity[]>;
  public abstract findById(id: string): Promise<UserEntity | null>;
  public abstract getById(id: string): Promise<UserEntity>;
  public abstract findByEmail(email: string): Promise<UserEntity | null>;
  public abstract markEmailVerified(
    id: string,
    verifiedAt: Date,
  ): Promise<void>;

  public abstract updateEmail(
    id: string,
    email: string,
    verifiedAt: Date,
  ): Promise<void>;

  public abstract deleteById(id: string): Promise<void>;
}
