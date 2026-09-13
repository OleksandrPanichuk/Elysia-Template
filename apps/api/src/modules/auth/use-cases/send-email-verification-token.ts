import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import { UserEntity, UsersRepository } from "@/modules/users";

import { AuthService } from "../auth.service";

export interface SendEmailVerificationTokenUseCaseOptions {
  email: string;
}

type Options = SendEmailVerificationTokenUseCaseOptions;
type Result = void;

export class SendEmailVerificationTokenUseCase extends UseCase<
  Options,
  Result
> {
  private readonly usersRepository = makeRepository(UsersRepository);

  private readonly authService = makeService(AuthService);

  public async execute({ email }: Options): Promise<Result> {
    const user = await this.usersRepository.findByEmail(
      UserEntity.normalizeEmail(email),
    );

    if (!user || UserEntity.isEmailVerified(user)) return;

    await this.authService.sendEmailVerification(user);
  }
}
