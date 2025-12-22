/**
 * Currency utilities for PWA and Telegram bot
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const AVAILABLE_CURRENCIES: Record<string, Currency> = {
  USD: { code: 'USD', name: 'US Dollar', symbol: '$' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€' },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£' },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: '₣' },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  NGN: { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  KES: { code: 'KES', name: 'Kenyan Shilling', symbol: 'Sh' },
};

/**
 * Get currency symbol by code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return AVAILABLE_CURRENCIES[currencyCode]?.symbol || currencyCode;
}

/**
 * Get currency name by code
 */
export function getCurrencyName(currencyCode: string): string {
  return AVAILABLE_CURRENCIES[currencyCode]?.name || currencyCode;
}

/**
 * Format amount with currency
 */
export function formatCurrency(amount: number, currencyCode: string = 'USD'): string {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${Number(amount || 0).toLocaleString()}`;
}

/**
 * Get all available currency options for select dropdowns
 */
export function getCurrencyOptions() {
  return Object.entries(AVAILABLE_CURRENCIES).map(([code, currency]) => ({
    value: code,
    label: `${currency.name} (${code})`,
    symbol: currency.symbol,
  }));
}
