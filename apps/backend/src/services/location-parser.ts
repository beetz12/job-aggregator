/**
 * Location Parser Service
 * Parses raw location strings into structured data with remote work detection
 */

export interface ParsedLocation {
  raw: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  isRemote: boolean;
  remoteType?: 'full' | 'hybrid' | 'flexible';
}

// Patterns for detecting remote work types
const REMOTE_PATTERNS: { pattern: RegExp; type: 'full' | 'hybrid' | 'flexible' }[] = [
  // Full remote patterns
  { pattern: /\b(fully\s*remote|100%\s*remote|remote\s*only|completely\s*remote)\b/i, type: 'full' },
  { pattern: /\b(work\s*from\s*anywhere|wfa|remote\s*first)\b/i, type: 'full' },
  { pattern: /\b(worldwide|global|anywhere)\b/i, type: 'full' },

  // Hybrid patterns
  { pattern: /\b(hybrid|partial\s*remote|partly\s*remote)\b/i, type: 'hybrid' },
  { pattern: /\b(\d+\s*days?\s*(in\s*office|onsite|on-site))/i, type: 'hybrid' },
  { pattern: /\b(office\s*optional|remote\s*\+\s*office)\b/i, type: 'hybrid' },

  // Flexible patterns
  { pattern: /\b(flexible|flex\s*remote|remote\s*flexible)\b/i, type: 'flexible' },
  { pattern: /\b(occasional\s*remote|some\s*remote)\b/i, type: 'flexible' },

  // Generic remote (defaults to full)
  { pattern: /\bremote\b/i, type: 'full' },
];

// US state abbreviations to full names
const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico',
};

// Country names to ISO codes
const COUNTRY_CODES: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'us': 'US', 'u.s.': 'US', 'u.s.a.': 'US', 'america': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB', 'britain': 'GB',
  'canada': 'CA', 'germany': 'DE', 'deutschland': 'DE', 'france': 'FR',
  'australia': 'AU', 'netherlands': 'NL', 'holland': 'NL', 'spain': 'ES',
  'italy': 'IT', 'ireland': 'IE', 'switzerland': 'CH', 'sweden': 'SE',
  'norway': 'NO', 'denmark': 'DK', 'finland': 'FI', 'poland': 'PL',
  'portugal': 'PT', 'austria': 'AT', 'belgium': 'BE', 'czech republic': 'CZ',
  'czechia': 'CZ', 'israel': 'IL', 'india': 'IN', 'japan': 'JP',
  'china': 'CN', 'singapore': 'SG', 'brazil': 'BR', 'mexico': 'MX',
  'argentina': 'AR', 'new zealand': 'NZ', 'south africa': 'ZA',
  'south korea': 'KR', 'korea': 'KR', 'taiwan': 'TW', 'hong kong': 'HK',
  'uae': 'AE', 'united arab emirates': 'AE', 'dubai': 'AE',
  'russia': 'RU', 'ukraine': 'UA', 'romania': 'RO', 'bulgaria': 'BG',
  'greece': 'GR', 'hungary': 'HU', 'croatia': 'HR', 'slovakia': 'SK',
  'slovenia': 'SI', 'estonia': 'EE', 'latvia': 'LV', 'lithuania': 'LT',
  'luxembourg': 'LU', 'malta': 'MT', 'cyprus': 'CY', 'iceland': 'IS',
  'vietnam': 'VN', 'thailand': 'TH', 'malaysia': 'MY', 'indonesia': 'ID',
  'philippines': 'PH', 'pakistan': 'PK', 'bangladesh': 'BD', 'sri lanka': 'LK',
  'chile': 'CL', 'colombia': 'CO', 'peru': 'PE', 'venezuela': 'VE',
  'ecuador': 'EC', 'uruguay': 'UY', 'costa rica': 'CR', 'panama': 'PA',
  'nigeria': 'NG', 'kenya': 'KE', 'egypt': 'EG', 'morocco': 'MA',
  'turkey': 'TR', 'saudi arabia': 'SA', 'qatar': 'QA', 'kuwait': 'KW',
};

// Reverse lookup: code to country name
const COUNTRY_NAMES: Record<string, string> = Object.entries(COUNTRY_CODES).reduce(
  (acc, [name, code]) => {
    // Only store the first (canonical) name for each code
    if (!acc[code]) {
      acc[code] = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Detects if location indicates remote work and what type
 */
function detectRemote(text: string): { isRemote: boolean; remoteType?: 'full' | 'hybrid' | 'flexible' } {
  for (const { pattern, type } of REMOTE_PATTERNS) {
    if (pattern.test(text)) {
      return { isRemote: true, remoteType: type };
    }
  }
  return { isRemote: false };
}

/**
 * Normalizes and cleans a location part
 */
function cleanPart(part: string): string {
  return part
    .trim()
    .replace(/[()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Attempts to identify if a part is a US state (abbreviation or full name)
 */
function parseUSState(part: string): { abbr: string; full: string } | null {
  const upper = part.toUpperCase().trim();

  // Check if it's a state abbreviation
  if (US_STATES[upper]) {
    return { abbr: upper, full: US_STATES[upper] };
  }

  // Check if it's a full state name
  for (const [abbr, full] of Object.entries(US_STATES)) {
    if (full.toLowerCase() === part.toLowerCase().trim()) {
      return { abbr, full };
    }
  }

  return null;
}

/**
 * Attempts to identify if a part is a country
 */
function parseCountry(part: string): { name: string; code: string } | null {
  const lower = part.toLowerCase().trim();

  // Direct lookup
  if (COUNTRY_CODES[lower]) {
    const code = COUNTRY_CODES[lower];
    return { name: COUNTRY_NAMES[code] || part, code };
  }

  // Check if it's already a country code (2 letters)
  const upper = part.toUpperCase().trim();
  if (upper.length === 2 && COUNTRY_NAMES[upper]) {
    return { name: COUNTRY_NAMES[upper], code: upper };
  }

  return null;
}

/**
 * Parses a raw location string into structured data
 *
 * @param raw - Raw location string (e.g., "San Francisco, CA, USA" or "Remote - Europe")
 * @returns ParsedLocation with structured data
 */
export function parseLocation(raw: string | undefined): ParsedLocation {
  if (!raw || raw.trim() === '') {
    return { raw: '', isRemote: false };
  }

  const normalizedRaw = raw.trim();
  const result: ParsedLocation = {
    raw: normalizedRaw,
    isRemote: false,
  };

  // Detect remote work
  const remoteInfo = detectRemote(normalizedRaw);
  result.isRemote = remoteInfo.isRemote;
  if (remoteInfo.remoteType) {
    result.remoteType = remoteInfo.remoteType;
  }

  // Remove remote-related text for parsing the actual location
  let locationText = normalizedRaw
    .replace(/\b(fully\s*)?remote(\s*only)?\b/gi, '')
    .replace(/\b(work\s*from\s*anywhere|wfa|remote\s*first)\b/gi, '')
    .replace(/\b(hybrid|partial\s*remote)\b/gi, '')
    .replace(/\b(worldwide|global|anywhere)\b/gi, '')
    .replace(/\b(flexible|flex)\b/gi, '')
    .replace(/[()[\]{}]/g, '')
    .replace(/[-\/|]/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  // Split by comma and clean parts
  const parts = locationText
    .split(',')
    .map(cleanPart)
    .filter(p => p.length > 0);

  if (parts.length === 0) {
    return result;
  }

  // Parse based on number of parts
  if (parts.length === 1) {
    const part = parts[0];

    // Check if it's a country
    const country = parseCountry(part);
    if (country) {
      result.country = country.name;
      result.countryCode = country.code;
      return result;
    }

    // Check if it's a US state
    const state = parseUSState(part);
    if (state) {
      result.state = state.full;
      result.country = 'United States';
      result.countryCode = 'US';
      return result;
    }

    // Assume it's a city
    result.city = part;
  } else if (parts.length === 2) {
    // Could be: City, State | City, Country | State, Country
    const second = parts[1];
    const state = parseUSState(second);
    const country = parseCountry(second);

    if (state) {
      result.city = parts[0];
      result.state = state.full;
      result.country = 'United States';
      result.countryCode = 'US';
    } else if (country) {
      // Check if first part is a state
      const firstAsState = parseUSState(parts[0]);
      if (firstAsState && country.code === 'US') {
        result.state = firstAsState.full;
      } else {
        result.city = parts[0];
      }
      result.country = country.name;
      result.countryCode = country.code;
    } else {
      // Assume City, Region format
      result.city = parts[0];
      result.state = parts[1];
    }
  } else {
    // 3+ parts: assume City, State/Region, Country
    result.city = parts[0];

    const lastPart = parts[parts.length - 1];
    const country = parseCountry(lastPart);

    if (country) {
      result.country = country.name;
      result.countryCode = country.code;

      // Middle parts are state/region
      const middleParts = parts.slice(1, -1);
      if (middleParts.length > 0) {
        const stateCheck = parseUSState(middleParts[0]);
        if (stateCheck && country.code === 'US') {
          result.state = stateCheck.full;
        } else {
          result.state = middleParts.join(', ');
        }
      }
    } else {
      // No country detected, use second part as state
      result.state = parts.slice(1).join(', ');
    }
  }

  return result;
}

/**
 * Formats a ParsedLocation back into a readable string
 */
export function formatLocation(parsed: ParsedLocation): string {
  const parts: string[] = [];

  if (parsed.city) parts.push(parsed.city);
  if (parsed.state) parts.push(parsed.state);
  if (parsed.country) parts.push(parsed.country);

  let location = parts.join(', ');

  if (parsed.isRemote) {
    const remoteLabel = parsed.remoteType
      ? `${parsed.remoteType.charAt(0).toUpperCase() + parsed.remoteType.slice(1)} Remote`
      : 'Remote';
    location = location ? `${remoteLabel} - ${location}` : remoteLabel;
  }

  return location || parsed.raw;
}
