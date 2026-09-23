export const rateLimitStoreKey = (scope: string, subject: string): string =>
  `${scope}|${subject}`;
