/** Aniversário em UTC: mantém o dia original, mesmo depois de fevereiro. */
export function anniversary(anchor: Date, months: number): Date {
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + months;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(anchor.getUTCDate(), last),
    anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds()));
}

export function currentCycle(anchor: Date, now = new Date()) {
  let months = Math.max(0, (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + now.getUTCMonth() - anchor.getUTCMonth());
  if (anniversary(anchor, months) > now) months = Math.max(0, months - 1);
  return { start: anniversary(anchor, months), end: anniversary(anchor, months + 1) };
}
