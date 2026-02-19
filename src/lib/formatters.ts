// Format currency from cents to dollars
export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Format currency without decimals for whole dollars
export function formatCurrencyWhole(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}
