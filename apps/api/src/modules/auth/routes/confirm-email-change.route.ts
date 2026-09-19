import { defineRoute } from "@/core/route";

import { AuthMessageModel } from "../auth.model";
import type { AuthActions } from "../auth.routes";
import { ConfirmEmailChangeInput } from "../dto";

export const confirmEmailChangeRoute = ({ confirmEmailChange }: AuthActions) =>
  defineRoute({
    body: ConfirmEmailChangeInput,
    response: AuthMessageModel,
    summary: "Confirm a new email from the link that was sent to it",

    action: ({ body }) => confirmEmailChange.execute({ token: body.token }),
    postAction: () => ({ message: "ok" }),
  });
