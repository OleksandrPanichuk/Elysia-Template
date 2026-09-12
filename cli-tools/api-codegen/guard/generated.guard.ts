import type { SignUpInput } from "@/modules/auth/dto/sign-up.dto";
import type { UserModel } from "@/modules/users/user.model";

import type {
  SignUpInput as GeneratedSignUpInput,
  UserModel as GeneratedUserModel,
} from "../../../packages/api-client/src/generated/models";
import type { Routes } from "../../../packages/api-client/src/generated/routes";

type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const _userModelMatches: Exact<GeneratedUserModel, UserModel> = true;
const _signUpInputMatches: Exact<GeneratedSignUpInput, SignUpInput> = true;

const _currentUserRouteMatches: Exact<
  Routes["api"]["users"]["me"]["get"]["response"],
  UserModel
> = true;

const _signUpRouteMatches: Exact<
  Routes["api"]["auth"]["signUp"]["post"]["body"],
  SignUpInput
> = true;
