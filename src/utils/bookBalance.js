export function normalizeBookBalanceResponse(data) {
  if (!data || typeof data !== "object") return null;
  const nested = data.bookBalance && typeof data.bookBalance === "object" ? data.bookBalance : null;
  const source = nested || data;
  const balanceValue = nested
    ? (nested.balance ?? nested.bookBalance)
    : (data.balance ?? data.bookBalance);
  const moneyInValue = nested?.moneyIn ?? data.moneyIn;
  const moneyOutValue = nested?.moneyOut ?? data.moneyOut;
  const asOf = nested?.asOf ?? data.asOf;
  const numeric = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  return {
    ...source,
    balance: numeric(balanceValue),
    bookBalance: numeric(balanceValue),
    moneyIn: numeric(moneyInValue),
    moneyOut: numeric(moneyOutValue),
    asOf: asOf || null,
  };
}
