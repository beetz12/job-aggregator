/**
 * Salary Parser Service
 * Parses salary strings into normalized format with currency conversion
 */

export interface ParsedSalary {
  min?: number;
  max?: number;
  currency: string;
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  normalizedYearly?: { min?: number; max?: number };
  raw: string;
}

// Multipliers to convert different periods to yearly salary
const PERIOD_MULTIPLIERS: Record<string, number> = {
  hourly: 40 * 52,      // 40 hours/week * 52 weeks
  daily: 5 * 52,        // 5 days/week * 52 weeks
  weekly: 52,           // 52 weeks
  monthly: 12,          // 12 months
  yearly: 1,
};

// Approximate exchange rates to USD (as of late 2024)
// These should ideally be fetched from an API for production use
const CURRENCY_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.10,
  GBP: 1.27,
  CAD: 0.74,
  AUD: 0.66,
  CHF: 1.13,
  JPY: 0.0067,
  INR: 0.012,
  CNY: 0.14,
  BRL: 0.20,
  MXN: 0.058,
  SGD: 0.75,
  HKD: 0.13,
  SEK: 0.096,
  NOK: 0.094,
  DKK: 0.15,
  PLN: 0.25,
  CZK: 0.044,
  NZD: 0.62,
  ZAR: 0.055,
  KRW: 0.00077,
  TWD: 0.031,
  THB: 0.029,
  PHP: 0.018,
  ILS: 0.27,
  AED: 0.27,
  SAR: 0.27,
};

// Currency symbols to currency codes
const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD',
  '\u20AC': 'EUR',  // Euro sign
  '\u00A3': 'GBP',  // Pound sign
  '\u00A5': 'JPY',  // Yen sign
  '\u20B9': 'INR',  // Rupee sign
  'R$': 'BRL',
  'C$': 'CAD',
  'A$': 'AUD',
  'S$': 'SGD',
  'HK$': 'HKD',
  'NZ$': 'NZD',
  '\u20A8': 'PKR',  // Rupee sign (Pakistan)
  '\u20B1': 'PHP',  // Peso sign
  '\u20AA': 'ILS',  // Shekel sign
  '\u20BD': 'RUB',  // Ruble sign
  '\u20B4': 'UAH',  // Hryvnia sign
  'CHF': 'CHF',
  'kr': 'SEK',      // Could also be NOK, DKK - context dependent
  'z\u0142': 'PLN',
  'K\u010D': 'CZK',
  'R': 'ZAR',
};

// Period keywords
const PERIOD_KEYWORDS: Record<string, 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
  // Hourly
  'hour': 'hourly', 'hourly': 'hourly', 'hr': 'hourly', '/hr': 'hourly',
  'per hour': 'hourly', 'an hour': 'hourly', '/hour': 'hourly', 'p/h': 'hourly',

  // Daily
  'day': 'daily', 'daily': 'daily', '/day': 'daily', 'per day': 'daily',
  'a day': 'daily', 'per diem': 'daily',

  // Weekly
  'week': 'weekly', 'weekly': 'weekly', '/week': 'weekly', 'per week': 'weekly',
  'a week': 'weekly', '/wk': 'weekly', 'pw': 'weekly',

  // Monthly
  'month': 'monthly', 'monthly': 'monthly', '/month': 'monthly', 'per month': 'monthly',
  'a month': 'monthly', '/mo': 'monthly', 'pm': 'monthly', 'pcm': 'monthly',

  // Yearly
  'year': 'yearly', 'yearly': 'yearly', 'annual': 'yearly', 'annually': 'yearly',
  '/year': 'yearly', 'per year': 'yearly', 'a year': 'yearly', 'pa': 'yearly',
  'per annum': 'yearly', '/yr': 'yearly', 'p.a.': 'yearly',
};

/**
 * Detects currency from text or symbol
 */
export function detectCurrency(text: string): string {
  const upper = text.toUpperCase();

  // Check for explicit currency codes first
  for (const code of Object.keys(CURRENCY_TO_USD)) {
    if (upper.includes(code)) {
      return code;
    }
  }

  // Check for currency symbols
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(symbol)) {
      return code;
    }
  }

  // Check for specific multi-char symbols
  if (text.includes('C$') || upper.includes('CAD')) return 'CAD';
  if (text.includes('A$') || upper.includes('AUD')) return 'AUD';
  if (text.includes('S$') || upper.includes('SGD')) return 'SGD';
  if (text.includes('NZ$') || upper.includes('NZD')) return 'NZD';
  if (text.includes('HK$') || upper.includes('HKD')) return 'HKD';
  if (text.includes('R$') || upper.includes('BRL')) return 'BRL';

  // Default to USD
  return 'USD';
}

/**
 * Detects period from keywords or infers from magnitude
 */
export function detectPeriod(text: string, value?: number): 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' {
  const lower = text.toLowerCase();

  // Check for explicit period keywords
  for (const [keyword, period] of Object.entries(PERIOD_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return period;
    }
  }

  // Infer from value magnitude (assuming USD-like currencies)
  if (value !== undefined) {
    if (value < 100) return 'hourly';           // $15-99 likely hourly
    if (value < 500) return 'daily';            // $100-499 likely daily
    if (value < 3000) return 'weekly';          // $500-2999 likely weekly
    if (value < 20000) return 'monthly';        // $3000-19999 likely monthly
    return 'yearly';                             // $20000+ likely yearly
  }

  // Default to yearly for job postings
  return 'yearly';
}

/**
 * Expands "k" suffix to thousands
 */
function expandK(value: string): number {
  const cleaned = value.replace(/,/g, '').trim();
  const kMatch = cleaned.match(/^([\d.]+)\s*k$/i);

  if (kMatch) {
    return parseFloat(kMatch[1]) * 1000;
  }

  const mMatch = cleaned.match(/^([\d.]+)\s*m$/i);
  if (mMatch) {
    return parseFloat(mMatch[1]) * 1000000;
  }

  return parseFloat(cleaned);
}

/**
 * Extracts min/max salary range from text
 */
export function extractRange(text: string): { min?: number; max?: number } {
  const result: { min?: number; max?: number } = {};

  // Clean the text
  const cleaned = text
    .replace(/[$\u20AC\u00A3\u00A5\u20B9]/g, '')  // Remove currency symbols
    .replace(/,/g, '')                              // Remove commas
    .trim();

  // Pattern: "50k-70k", "50,000-70,000", "50000 - 70000"
  const rangeMatch = cleaned.match(/([\d.]+)\s*k?\s*[-\u2013\u2014to]+\s*([\d.]+)\s*k?/i);
  if (rangeMatch) {
    const minStr = rangeMatch[1] + (rangeMatch[0].toLowerCase().includes('k') && !rangeMatch[1].includes('.') ? 'k' : '');
    const maxStr = rangeMatch[2] + (rangeMatch[0].toLowerCase().match(/\d\s*k/i) ? 'k' : '');

    // Determine if k suffix applies
    const hasKInRange = /\dk/i.test(rangeMatch[0]);
    result.min = hasKInRange && !rangeMatch[1].includes('.') ? expandK(rangeMatch[1] + 'k') : expandK(rangeMatch[1]);
    result.max = hasKInRange ? expandK(rangeMatch[2] + 'k') : expandK(rangeMatch[2]);

    // Re-check for explicit k suffix
    const kMatches = rangeMatch[0].match(/(\d+\.?\d*)\s*k/gi);
    if (kMatches) {
      if (kMatches.length >= 1) result.min = expandK(kMatches[0]);
      if (kMatches.length >= 2) result.max = expandK(kMatches[1]);
    }

    return result;
  }

  // Pattern: "up to 100k", "up to $100,000"
  const upToMatch = cleaned.match(/up\s*to\s*([\d.]+)\s*k?/i);
  if (upToMatch) {
    const hasK = /k/i.test(upToMatch[0]);
    result.max = hasK ? expandK(upToMatch[1] + 'k') : expandK(upToMatch[1]);
    return result;
  }

  // Pattern: "from 80k", "starting at $80,000", "minimum 80k"
  const fromMatch = cleaned.match(/(?:from|starting\s*(?:at)?|minimum|min|at\s*least)\s*([\d.]+)\s*k?/i);
  if (fromMatch) {
    const hasK = /k/i.test(fromMatch[0]);
    result.min = hasK ? expandK(fromMatch[1] + 'k') : expandK(fromMatch[1]);
    return result;
  }

  // Pattern: single value with k "100k"
  const singleKMatch = cleaned.match(/^([\d.]+)\s*k$/i);
  if (singleKMatch) {
    const value = expandK(singleKMatch[1] + 'k');
    result.min = value;
    result.max = value;
    return result;
  }

  // Pattern: single number "100000"
  const singleMatch = cleaned.match(/^([\d.]+)$/);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    if (value > 0) {
      result.min = value;
      result.max = value;
    }
    return result;
  }

  return result;
}

/**
 * Normalizes salary to yearly USD equivalent
 */
function normalizeToYearlyUSD(
  value: number,
  currency: string,
  period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'
): number {
  const periodMultiplier = PERIOD_MULTIPLIERS[period] || 1;
  const currencyRate = CURRENCY_TO_USD[currency] || 1;

  return Math.round(value * periodMultiplier * currencyRate);
}

/**
 * Parses a salary string or structured data into normalized format
 *
 * @param raw - Raw salary string (e.g., "$50k-70k", "100000 EUR/year")
 * @param min - Optional pre-parsed minimum value
 * @param max - Optional pre-parsed maximum value
 * @param currency - Optional pre-specified currency code
 * @returns ParsedSalary or null if no salary could be parsed
 */
export function parseSalary(
  raw: string | undefined,
  min?: number,
  max?: number,
  currency?: string
): ParsedSalary | null {
  if (!raw && min === undefined && max === undefined) {
    return null;
  }

  const rawStr = raw || '';

  // Use provided values or extract from raw string
  let salaryMin = min;
  let salaryMax = max;

  if ((salaryMin === undefined || salaryMax === undefined) && rawStr) {
    const extracted = extractRange(rawStr);
    if (salaryMin === undefined) salaryMin = extracted.min;
    if (salaryMax === undefined) salaryMax = extracted.max;
  }

  // If we still have no values, return null
  if (salaryMin === undefined && salaryMax === undefined) {
    return null;
  }

  // Detect currency
  const detectedCurrency = currency || detectCurrency(rawStr);

  // Detect period
  const referenceValue = salaryMax || salaryMin;
  const period = detectPeriod(rawStr, referenceValue);

  // Build result
  const result: ParsedSalary = {
    currency: detectedCurrency,
    period,
    raw: rawStr,
  };

  if (salaryMin !== undefined) result.min = salaryMin;
  if (salaryMax !== undefined) result.max = salaryMax;

  // Calculate normalized yearly USD
  result.normalizedYearly = {};
  if (salaryMin !== undefined) {
    result.normalizedYearly.min = normalizeToYearlyUSD(salaryMin, detectedCurrency, period);
  }
  if (salaryMax !== undefined) {
    result.normalizedYearly.max = normalizeToYearlyUSD(salaryMax, detectedCurrency, period);
  }

  return result;
}

/**
 * Formats a ParsedSalary into a readable string
 */
export function formatSalary(parsed: ParsedSalary): string {
  const currencySymbol = Object.entries(CURRENCY_SYMBOLS).find(([, code]) => code === parsed.currency)?.[0] || parsed.currency + ' ';

  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(0) + 'k';
    }
    return value.toString();
  };

  let result = '';
  if (parsed.min !== undefined && parsed.max !== undefined) {
    if (parsed.min === parsed.max) {
      result = currencySymbol + formatValue(parsed.min);
    } else {
      result = currencySymbol + formatValue(parsed.min) + ' - ' + currencySymbol + formatValue(parsed.max);
    }
  } else if (parsed.min !== undefined) {
    result = 'From ' + currencySymbol + formatValue(parsed.min);
  } else if (parsed.max !== undefined) {
    result = 'Up to ' + currencySymbol + formatValue(parsed.max);
  }

  if (parsed.period !== 'yearly') {
    result += '/' + parsed.period.replace('ly', '');
  }

  return result;
}
