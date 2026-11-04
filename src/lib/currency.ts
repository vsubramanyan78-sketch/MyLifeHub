import { CurrencyInfo } from '../types';

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED ' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

export interface RatesCache {
  base: string;
  timestamp: number;
  rates: Record<string, number>;
  source: string;
}

const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 86.85,
  EUR: 0.94,
  GBP: 0.81,
  AED: 3.67,
  SGD: 1.34,
  AUD: 1.54,
  CAD: 1.40,
  JPY: 153.2,
};

let activeRates: RatesCache = {
  base: 'USD',
  timestamp: Date.now(),
  rates: { ...DEFAULT_RATES },
  source: 'Built-in Baseline',
};

export async function fetchExchangeRates(): Promise<RatesCache> {
  try {
    const res = await fetch('/api/currency/rates');
    if (res.ok) {
      const data = await res.json();
      if (data.rates) {
        activeRates = {
          base: data.base || 'USD',
          timestamp: data.timestamp || Date.now(),
          rates: { ...DEFAULT_RATES, ...data.rates },
          source: data.source || 'Exchange Rate Service',
        };
      }
    }
  } catch (err) {
    console.warn('Failed to fetch updated currency rates, using active cache', err);
  }
  return activeRates;
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates = activeRates.rates
): { convertedAmount: number; rateUsed: number } {
  if (fromCurrency === toCurrency) {
    return { convertedAmount: amount, rateUsed: 1.0 };
  }

  const fromRate = rates[fromCurrency] || DEFAULT_RATES[fromCurrency] || 1;
  const toRate = rates[toCurrency] || DEFAULT_RATES[toCurrency] || 1;

  // Convert to USD base first, then to target
  // e.g. amount in INR -> USD = amount / inrRate
  // USD -> EUR = (amount / inrRate) * eurRate
  const rateUsed = toRate / fromRate;
  const convertedAmount = Math.round(amount * rateUsed * 100) / 100;

  return { convertedAmount, rateUsed };
}

export function formatCurrency(amount: number, currencyCode = 'INR'): string {
  const currency = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  const symbol = currency ? currency.symbol : `${currencyCode} `;
  const formattedNumber = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${symbol}${formattedNumber}`;
}

export function getCurrencySymbol(currencyCode = 'INR'): string {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
  return found ? found.symbol : currencyCode;
}
