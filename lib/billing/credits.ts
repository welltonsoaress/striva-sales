/** Régua comercial atual. Tokens e custo operacional são medidas separadas. */
export const CREDIT_METER = "credit_v3" as const;
export const CREDITS_PER_MESSAGE = 10;
export const TRIAL_CREDITS = 1000;
export const EXTRA_PACK_CREDITS = 1000;
export const EXTRA_PACK_PRICE_CENTS = 4999;

/** Compatibilidade de leitura: recibos antigos não são reescritos. */
export function currentCreditUnits(units: number, meter: string) {
  return meter === "response_v2" ? units * CREDITS_PER_MESSAGE : units;
}

export function usableCredits(account: {
  state: string;
  monthly_remaining: number;
  extra_remaining: number;
}) {
  return account.monthly_remaining + (account.state === "active" ? account.extra_remaining : 0);
}

export function availableMessages(credits: number) {
  return Math.floor(Math.max(0, credits) / CREDITS_PER_MESSAGE);
}
