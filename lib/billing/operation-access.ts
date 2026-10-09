export interface OperationAccount {
  mode: string;
  state: string;
  access_until: string | null;
}

/** Saldo de IA não limita o trabalho humano durante o período contratado. */
export function tenantOperationAllowed(
  account: OperationAccount | null,
  now = Date.now(),
): boolean {
  if (!account) return false;
  if (account.mode === "legacy") return true;
  if (account.mode !== "platform") return false;
  if (account.state === "pending") return true;
  if (!["active", "trial"].includes(account.state) || !account.access_until) return false;
  const until = Date.parse(account.access_until);
  return Number.isFinite(until) && until > now;
}
